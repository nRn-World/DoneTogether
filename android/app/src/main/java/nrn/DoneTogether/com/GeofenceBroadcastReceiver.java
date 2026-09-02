package nrn.DoneTogether.com;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofenceStatusCodes;
import com.google.android.gms.location.GeofencingEvent;

import java.util.List;

public class GeofenceBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = "GeofenceBroadcast";
    private static final String CHANNEL_ID = "donetogether_geofence";

    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent geofencingEvent = GeofencingEvent.fromIntent(intent);

        if (geofencingEvent == null) {
            Log.e(TAG, "GeofencingEvent is null");
            return;
        }

        if (geofencingEvent.hasError()) {
            String errorMessage = GeofenceStatusCodes.getStatusCodeString(geofencingEvent.getErrorCode());
            Log.e(TAG, "Geofence error: " + errorMessage);
            return;
        }

        int geofenceTransition = geofencingEvent.getGeofenceTransition();
        boolean isEnter = geofenceTransition == Geofence.GEOFENCE_TRANSITION_ENTER;
        boolean isExit = geofenceTransition == Geofence.GEOFENCE_TRANSITION_EXIT;

        if (!isEnter && !isExit) {
            return;
        }

        List<Geofence> triggeringGeofences = geofencingEvent.getTriggeringGeofences();
        if (triggeringGeofences == null || triggeringGeofences.isEmpty()) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(GeofenceRestorer.PREFS_NAME, Context.MODE_PRIVATE);
        for (Geofence geofence : triggeringGeofences) {
            String id = geofence.getRequestId();
            String expected = prefs.getString("trigger:" + id, "enter");
            boolean expectsExit = "exit".equalsIgnoreCase(expected);

            // Only fire if transition matches what this fence was registered for
            if (expectsExit && !isExit) continue;
            if (!expectsExit && !isEnter) continue;

            String title = prefs.getString("title:" + id, "DoneTogether");
            String message = prefs.getString("message:" + id,
                expectsExit ? "Du lämnade platsen." : "Du är framme.");
            Log.d(TAG, (isExit ? "Exited" : "Entered") + " geofence: " + id);
            showNotification(context, title, message);
        }
    }

    private void showNotification(Context context, String title, String message) {
        createNotificationChannel(context);

        Intent notificationIntent = new Intent(context, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (notificationManager != null) {
            int notifyId = (idHash(title + message) & 0x7fffffff);
            notificationManager.notify(notifyId, builder.build());
        }
    }

    private static int idHash(String s) {
        return s == null ? (int) System.currentTimeMillis() : s.hashCode();
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "DoneTogether Geofence",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notiser när du närmar dig eller lämnar sparade platser");

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
