package nrn.DoneTogether.com;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

@CapacitorPlugin(name = "AppReview")
public class AppReviewPlugin extends Plugin {

    @PluginMethod
    public void requestReview(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve(new JSObject().put("shown", false));
            return;
        }

        ReviewManager manager = ReviewManagerFactory.create(activity);
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                call.resolve(new JSObject().put("shown", false));
                return;
            }
            ReviewInfo reviewInfo = task.getResult();
            manager.launchReviewFlow(activity, reviewInfo).addOnCompleteListener(flowTask -> {
                call.resolve(new JSObject().put("shown", true));
            });
        });
    }
}
