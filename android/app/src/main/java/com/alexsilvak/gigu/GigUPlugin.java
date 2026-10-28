package com.alexsilvak.gigu;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "GigUPlugin")
public class GigUPlugin extends Plugin {

    @PluginMethod
    public void startOverlay(PluginCall call) {
        // 1. Verifica se tem permissão para desenhar sobre outros apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("status", "permission_needed");
            call.resolve(ret);
            return;
        }

        // 2. Inicia o Serviço do Orb
        Intent intent = new Intent(getContext(), GigUOverlayService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject ret = new JSObject();
        ret.put("status", "started");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), GigUOverlayService.class);
        getContext().stopService(intent);

        JSObject ret = new JSObject();
        ret.put("status", "stopped");
        call.resolve(ret);
    }
}