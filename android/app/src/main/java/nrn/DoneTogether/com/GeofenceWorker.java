package nrn.DoneTogether.com;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
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

public class GeofenceWorker extends Worker {
    private static final String TAG = "GeofenceWorker";

    public GeofenceWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        String geofenceData = getInputData().getString("geofences");
        
        if (geofenceData == null || geofenceData.isEmpty()) {
            return Result.success();
        }

        try {
            JSONArray geofences = new JSONArray(geofenceData);
            addGeofences(geofences);
            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Error processing geofences", e);
            return Result.failure();
        }
    }

    private void addGeofences(JSONArray geofences) throws Exception {
        Context context = getApplicationContext();
        GeofencingClient geofencingClient = LocationServices.getGeofencingClient(context);

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) 
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission not granted");
            return;
        }

        List<Geofence> geofenceList = new ArrayList<>();
        
        for (int i = 0; i < geofences.length(); i++) {
            JSONObject geo = geofences.getJSONObject(i);
            String id = geo.getString("id");
            double lat = geo.getDouble("latitude");
            double lng = geo.getDouble("longitude");
            float radius = (float) geo.optDouble("radius", 100);
            
            geofenceList.add(new Geofence.Builder()
                .setRequestId(id)
                .setCircularRegion(lat, lng, radius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                .build());
        }

        if (geofenceList.isEmpty()) return;

        GeofencingRequest request = new GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofenceList)
            .build();

        Intent intent = new Intent(context, GeofenceBroadcastReceiver.class);
        PendingIntent geofencePendingIntent = PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );

        geofencingClient.addGeofences(request, geofencePendingIntent)
            .addOnSuccessListener(aVoid -> Log.d(TAG, "Geofences added successfully"))
            .addOnFailureListener(e -> Log.e(TAG, "Failed to add geofences", e));
    }
}