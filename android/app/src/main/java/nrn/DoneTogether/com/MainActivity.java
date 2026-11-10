package nrn.DoneTogether.com;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GeofencePlugin.class);
        registerPlugin(GoogleAuth.class);
        super.onCreate(savedInstanceState);
        // Android 15+ draws edge-to-edge: keep the app above the system status/nav bars.
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(Color.parseColor("#09090b")); // matches the app's dark background
        WindowCompat.getInsetsController(getWindow(), content).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), content).setAppearanceLightNavigationBars(false);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
