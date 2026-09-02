package nrn.DoneTogether.com;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.LocationServices;

import org.json.JSONArray;

@CapacitorPlugin(
    name = "GeofencePlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "background",
            strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class GeofencePlugin extends Plugin {
    private static final String TAG = "GeofencePlugin";
    private GeofencingClient geofencingClient;

    @Override
    public void load() {
        super.load();
        geofencingClient = LocationServices.getGeofencingClient(getContext());
        Log.d(TAG, "GeofencePlugin loaded");
    }

    @PluginMethod
    public void addGeofences(PluginCall call) {
        JSArray geofencesArray = call.getArray("geofences");

        if (geofencesArray == null) {
            call.reject("No geofences provided");
            return;
        }

        try {
            Context context = getContext();
            JSONArray geofences = new JSONArray(geofencesArray.toString());
            GeofenceRestorer.addFromJsonAsync(context, geofences, true, (count, error) -> {
                if (error != null) {
                    call.reject("Error: " + error.getMessage());
                    return;
                }
                if (count < 0) {
                    call.reject("Location permission not granted");
                    return;
                }
                call.resolve(new JSObject().put("success", true).put("count", count));
            });
        } catch (Exception e) {
            Log.e(TAG, "Error adding geofences", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void removeGeofences(PluginCall call) {
        Context context = getContext();
        GeofenceRestorer.clearPrefs(context);

        geofencingClient.removeGeofences(GeofenceRestorer.getPendingIntent(context))
            .addOnSuccessListener(aVoid -> call.resolve(new JSObject().put("success", true)))
            .addOnFailureListener(e -> {
                // Still resolve — prefs cleared; next add will re-register
                Log.w(TAG, "removeGeofences soft-fail: " + e.getMessage());
                call.resolve(new JSObject().put("success", true));
            });
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean locationGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean notificationsGranted = Build.VERSION.SDK_INT < 33
            || getPermissionState("notifications") == PermissionState.GRANTED;

        if (!locationGranted || !notificationsGranted) {
            requestPermissionForAliases(
                new String[] { "location", "notifications" },
                call,
                "foregroundPermissionsCallback"
            );
            return;
        }

        // Android 10+: background location must be requested after foreground is granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && getPermissionState("background") != PermissionState.GRANTED) {
            requestPermissionForAlias("background", call, "backgroundPermissionCallback");
            return;
        }

        call.resolve(new JSObject().put("granted", true));
    }

    @PermissionCallback
    private void foregroundPermissionsCallback(PluginCall call) {
        boolean locationGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean notificationsGranted = Build.VERSION.SDK_INT < 33
            || getPermissionState("notifications") == PermissionState.GRANTED;

        if (!locationGranted || !notificationsGranted) {
            call.resolve(new JSObject().put("granted", false));
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && getPermissionState("background") != PermissionState.GRANTED) {
            requestPermissionForAlias("background", call, "backgroundPermissionCallback");
            return;
        }

        call.resolve(new JSObject().put("granted", true));
    }

    @PermissionCallback
    private void backgroundPermissionCallback(PluginCall call) {
        // Foreground location is enough to register; background improves reliability
        boolean locationGranted = getPermissionState("location") == PermissionState.GRANTED;
        call.resolve(new JSObject().put("granted", locationGranted));
    }
}
