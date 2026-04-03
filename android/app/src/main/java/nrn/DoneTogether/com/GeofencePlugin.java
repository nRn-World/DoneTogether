package nrn.DoneTogether.com;

import android.Manifest;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Data;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "GeofencePlugin")
public class GeofencePlugin extends Plugin {
    private static final String TAG = "GeofencePlugin";
    private GeofencingClient geofencingClient;
    private final List<Geofence> geofenceList = new ArrayList<>();

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
            JSONArray geofences = new JSONArray(geofencesArray.toString());
            List<Geofence> newGeofences = new ArrayList<>();

            for (int i = 0; i < geofences.length(); i++) {
                JSONObject geo = geofences.getJSONObject(i);
                String id = geo.getString("id");
                double lat = geo.getDouble("latitude");
                double lng = geo.getDouble("longitude");
                float radius = (float) geo.optDouble("radius", 100);

                newGeofences.add(new Geofence.Builder()
                    .setRequestId(id)
                    .setCircularRegion(lat, lng, radius)
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                    .build());
            }

            geofenceList.clear();
            geofenceList.addAll(newGeofences);

            if (ContextCompat.checkSelfPermission(bridge.getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                    == PackageManager.PERMISSION_GRANTED) {
                
                GeofencingRequest request = new GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofences(geofenceList)
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
        geofencingClient.removeGeofences(geofenceList)
            .addOnSuccessListener(aVoid -> {
                geofenceList.clear();
                call.resolve(new JSObject().put("success", true));
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to remove geofences");
            });
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        // Request permission - this will be handled by the app
        // For now, we check if we already have permission
        if (ContextCompat.checkSelfPermission(bridge.getContext(), Manifest.permission.ACCESS_FINE_LOCATION) 
                == PackageManager.PERMISSION_GRANTED) {
            call.resolve(new JSObject().put("granted", true));
        } else {
            // Store the call to resolve after permission is granted
            call.resolve(new JSObject().put("granted", false));
        }
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