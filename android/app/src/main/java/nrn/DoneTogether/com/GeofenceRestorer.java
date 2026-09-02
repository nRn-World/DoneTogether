package nrn.DoneTogether.com;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.Tasks;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Shared helper to (re)register geofences from persisted JSON.
 * Used by GeofencePlugin and BootReceiver.
 */
public final class GeofenceRestorer {
    private static final String TAG = "GeofenceRestorer";
    public static final String PREFS_NAME = "donetogether_geofence_map";
    public static final String KEY_GEOFENCES_JSON = "geofences_json";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    public interface Callback {
        void onComplete(int count, Exception error);
    }

    private GeofenceRestorer() {}

    public static PendingIntent getPendingIntent(Context context) {
        Intent intent = new Intent(context, GeofenceBroadcastReceiver.class);
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
        );
    }

    /** Fire-and-forget restore after reboot (must not block BroadcastReceiver). */
    public static void restoreFromPrefsAsync(Context context) {
        final Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            SharedPreferences prefs = app.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String json = prefs.getString(KEY_GEOFENCES_JSON, null);
            if (json == null || json.isEmpty()) {
                Log.d(TAG, "No persisted geofences to restore");
                return;
            }
            try {
                int count = addFromJsonSync(app, new JSONArray(json), false);
                Log.d(TAG, "Restored geofences: " + count);
            } catch (Exception e) {
                Log.e(TAG, "Failed to restore geofences", e);
            }
        });
    }

    public static void addFromJsonAsync(Context context, JSONArray geofences, boolean persist, Callback callback) {
        final Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                int count = addFromJsonSync(app, geofences, persist);
                if (callback != null) callback.onComplete(count, null);
            } catch (Exception e) {
                Log.e(TAG, "addFromJson failed", e);
                if (callback != null) callback.onComplete(-1, e);
            }
        });
    }

    private static int addFromJsonSync(Context context, JSONArray geofences, boolean persist) throws Exception {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission not granted");
            return -1;
        }

        if (geofences.length() == 0) {
            return 0;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (persist) {
            editor.clear();
            editor.putString(KEY_GEOFENCES_JSON, geofences.toString());
        }

        List<Geofence> enterList = new ArrayList<>();
        List<Geofence> exitList = new ArrayList<>();

        for (int i = 0; i < geofences.length(); i++) {
            JSONObject geo = geofences.getJSONObject(i);
            String id = geo.getString("id");
            double lat = geo.getDouble("latitude");
            double lng = geo.getDouble("longitude");
            float radius = (float) geo.optDouble("radius", 100);
            String title = geo.optString("title", "DoneTogether");
            String message = geo.optString("message", id);
            String trigger = geo.optString("trigger", "enter");
            boolean isExit = "exit".equalsIgnoreCase(trigger);

            int transition = isExit
                ? Geofence.GEOFENCE_TRANSITION_EXIT
                : Geofence.GEOFENCE_TRANSITION_ENTER;

            Geofence fence = new Geofence.Builder()
                .setRequestId(id)
                .setCircularRegion(lat, lng, Math.max(radius, 5f))
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(transition)
                .build();

            if (isExit) {
                exitList.add(fence);
            } else {
                enterList.add(fence);
            }

            if (persist) {
                editor.putString("title:" + id, title);
                editor.putString("message:" + id, message);
                editor.putString("trigger:" + id, isExit ? "exit" : "enter");
            }
        }

        if (persist) {
            editor.apply();
        }

        GeofencingClient client = LocationServices.getGeofencingClient(context);
        PendingIntent pendingIntent = getPendingIntent(context);

        if (!enterList.isEmpty()) {
            GeofencingRequest enterRequest = new GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofences(enterList)
                .build();
            Tasks.await(client.addGeofences(enterRequest, pendingIntent), 20, TimeUnit.SECONDS);
            Log.d(TAG, "Registered " + enterList.size() + " ENTER geofences");
        }

        if (!exitList.isEmpty()) {
            GeofencingRequest exitRequest = new GeofencingRequest.Builder()
                .setInitialTrigger(0)
                .addGeofences(exitList)
                .build();
            Tasks.await(client.addGeofences(exitRequest, pendingIntent), 20, TimeUnit.SECONDS);
            Log.d(TAG, "Registered " + exitList.size() + " EXIT geofences");
        }

        return enterList.size() + exitList.size();
    }

    public static void clearPrefs(Context context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply();
    }
}
