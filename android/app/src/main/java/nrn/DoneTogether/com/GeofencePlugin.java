package nrn.DoneTogether.com;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "GeofencePlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class GeofencePlugin extends Plugin {
    private static final String TAG = "GeofencePlugin";
    private static final String PREFS_NAME = "donetogether_geofence_map";
    private GeofencingClient geofencingClient;
    private final List<String> geofenceIds = new ArrayList<>();

    @Override
    public void load() {
        super.load();
        geofencingClient = LocationServices.getGeofencingClient(bridge.getContext());
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
            Context context = bridge.getContext();
            JSONArray geofences = new JSONArray(geofencesArray.toString());
            List<Geofence> newGeofences = new ArrayList<>();
            geofenceIds.clear();

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.clear();

            for (int i = 0; i < geofences.length(); i++) {
                JSONObject geo = geofences.getJSONObject(i);
                String id = geo.getString("id");
                double lat = geo.getDouble("latitude");
                double lng = geo.getDouble("longitude");
                float radius = (float) geo.optDouble("radius", 100);
                String title = geo.optString("title", "DoneTogether");
                String message = geo.optString("message", id);

                newGeofences.add(new Geofence.Builder()
                    .setRequestId(id)
                    .setCircularRegion(lat, lng, radius)
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                    .build());
                geofenceIds.add(id);
                editor.putString("title:" + id, title);
                editor.putString("message:" + id, message);
            }
            editor.apply();

            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                
                GeofencingRequest request = new GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofences(newGeofences)
                    .build();

                geofencingClient.addGeofences(request, getGeofencePendingIntent())
                    .addOnSuccessListener(aVoid -> {
                        Log.d(TAG, "Geofences added successfully");
                        call.resolve(new JSObject().put("success", true));
                    })
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "Failed to add geofences", e);
                        call.reject("Failed to add geofences: " + e.getMessage());
                    });
            } else {
                call.reject("Location permission not granted");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error adding geofences", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void removeGeofences(PluginCall call) {
        Context context = bridge.getContext();
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply();
        geofenceIds.clear();

        geofencingClient.removeGeofences(getGeofencePendingIntent())
            .addOnSuccessListener(aVoid -> {
                call.resolve(new JSObject().put("success", true));
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to remove geofences");
            });
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean locationGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean notificationsGranted = android.os.Build.VERSION.SDK_INT < 33
            || getPermissionState("notifications") == PermissionState.GRANTED;

        if (locationGranted && notificationsGranted) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }

        requestAllPermissions(call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        boolean locationGranted = getPermissionState("location") == PermissionState.GRANTED;
        boolean notificationsGranted = android.os.Build.VERSION.SDK_INT < 33
            || getPermissionState("notifications") == PermissionState.GRANTED;
        call.resolve(new JSObject().put("granted", locationGranted && notificationsGranted));
    }

    private android.app.PendingIntent getGeofencePendingIntent() {
        Intent intent = new Intent(bridge.getContext(), GeofenceBroadcastReceiver.class);
        return android.app.PendingIntent.getBroadcast(
            bridge.getContext(), 
            0, 
            intent, 
            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_MUTABLE
        );
    }
}
