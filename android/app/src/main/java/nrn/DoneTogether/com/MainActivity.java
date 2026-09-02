package nrn.DoneTogether.com;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must register custom plugins before BridgeActivity initializes the bridge
        registerPlugin(GeofencePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
