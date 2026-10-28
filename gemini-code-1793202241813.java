package com.gigu.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.app.NotificationCompat;

public class GigUOverlayService extends Service {
    private WindowManager windowManager;
    private View overlayView;
    private WindowManager.LayoutParams params;
    private WebView orbWebView;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundServiceNotification();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Configuração da Janela Flutuante
        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                220, 220,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        // WebView para renderizar o Orb HTML
        orbWebView = new WebView(this);
        orbWebView.setBackgroundColor(0x00000000); // Transparente
        orbWebView.getSettings().setJavaScriptEnabled(true);
        orbWebView.loadUrl("file:///android_asset/public/orb.html");

        // Lógica de Arraste (Drag) e Clique no Orb
        orbWebView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        touchStartTime = System.currentTimeMillis();
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(orbWebView, params);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long clickDuration = System.currentTimeMillis() - touchStartTime;
                        // Se o toque durou menos de 200ms, considera um CLIQUE (dispara OCR)
                        if (clickDuration < 200) {
                            triggerScreenCapture();
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(orbWebView, params);
    }

    private void triggerScreenCapture() {
        // Altera estado visual do Orb no WebView
        orbWebView.evaluateJavascript("setStatus('analyzing')", null);

        // Envia um broadcast para a aplicação React acionar a captura/OCR
        Intent intent = new Intent("GIGU_TRIGGER_CAPTURE");
        sendBroadcast(intent);
    }

    private void startForegroundServiceNotification() {
        String CHANNEL_ID = "gigu_overlay_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "GigU Copiloto Ativo",
                    NotificationManager.IMPORTANCE_LOW
            );
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("GigU Ativo")
                .setContentText("Orb de análise em execução no inDrive")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build();

        startForeground(1001, notification);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (orbWebView != null && windowManager != null) {
            windowManager.removeView(orbWebView);
        }
    }
}