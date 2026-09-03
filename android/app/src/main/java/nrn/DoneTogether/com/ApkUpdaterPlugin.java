package nrn.DoneTogether.com;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    private static final String TAG = "ApkUpdater";
    private static final String APK_NAME = "donetogether-update.apk";

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url");
            return;
        }

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                File outFile = new File(activity.getCacheDir(), APK_NAME);
                if (outFile.exists() && !outFile.delete()) {
                    Log.w(TAG, "Could not delete old apk");
                }

                URL current = new URL(url);
                int redirects = 0;
                while (true) {
                    connection = (HttpURLConnection) current.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(30000);
                    connection.setReadTimeout(120000);
                    connection.setRequestProperty("User-Agent", "DoneTogether-Android");
                    connection.connect();
                    int code = connection.getResponseCode();
                    if ((code == HttpURLConnection.HTTP_MOVED_PERM
                            || code == HttpURLConnection.HTTP_MOVED_TEMP
                            || code == HttpURLConnection.HTTP_SEE_OTHER
                            || code == 307 || code == 308)
                            && redirects < 8) {
                        String redirect = connection.getHeaderField("Location");
                        connection.disconnect();
                        if (redirect == null || redirect.isEmpty()) {
                            activity.runOnUiThread(() -> call.reject("Redirect without Location"));
                            return;
                        }
                        current = new URL(current, redirect);
                        redirects++;
                        continue;
                    }
                    if (code < 200 || code >= 300) {
                        final int finalCode = code;
                        activity.runOnUiThread(() -> call.reject("Download failed HTTP " + finalCode));
                        return;
                    }
                    break;
                }

                long total = connection.getContentLengthLong();
                try (InputStream in = new BufferedInputStream(connection.getInputStream());
                     FileOutputStream out = new FileOutputStream(outFile)) {
                    byte[] buffer = new byte[8192];
                    long downloaded = 0;
                    int read;
                    int lastPct = -1;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        downloaded += read;
                        if (total > 0) {
                            int pct = (int) ((downloaded * 100) / total);
                            if (pct != lastPct && pct % 5 == 0) {
                                lastPct = pct;
                                final int progress = pct;
                                activity.runOnUiThread(() -> {
                                    JSObject prog = new JSObject();
                                    prog.put("progress", progress);
                                    notifyListeners("downloadProgress", prog);
                                });
                            }
                        }
                    }
                    out.flush();
                }

                if (outFile.length() < 1000) {
                    activity.runOnUiThread(() -> call.reject("Downloaded file too small"));
                    return;
                }

                activity.runOnUiThread(() -> {
                    try {
                        installApk(activity, outFile);
                        JSObject ret = new JSObject();
                        ret.put("ok", true);
                        ret.put("path", outFile.getAbsolutePath());
                        call.resolve(ret);
                    } catch (Exception e) {
                        Log.e(TAG, "Install failed", e);
                        call.reject("Install failed: " + e.getMessage(), e);
                    }
                });
            } catch (Exception e) {
                Log.e(TAG, "Download failed", e);
                final String msg = e.getMessage();
                activity.runOnUiThread(() -> call.reject("Download failed: " + msg, e));
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        Activity activity = getActivity();
        JSObject ret = new JSObject();
        if (activity == null) {
            ret.put("allowed", false);
            call.resolve(ret);
            return;
        }
        boolean allowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = activity.getPackageManager().canRequestPackageInstalls();
        }
        ret.put("allowed", allowed);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("No activity");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + activity.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        }
        call.resolve();
    }

    private void installApk(Activity activity, File apkFile) {
        Uri uri = FileProvider.getUriForFile(
                activity,
                activity.getPackageName() + ".fileprovider",
                apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }
}
