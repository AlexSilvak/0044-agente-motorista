package com.alexsilvak.gigu;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.FileObserver;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.app.NotificationCompat;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.File;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GigUOverlayService extends Service {
    private static final String TAG = "GigUOverlayService";

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private WebView orbWebView;
    private FileObserver downloadObserver;
    private TextRecognizer textRecognizer;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundServiceNotification();

        // Inicializa o reconhecedor de texto do ML Kit
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        iniciarMonitoramentoDownloads();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                220, 220,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 300;

        orbWebView = new WebView(this);
        orbWebView.setBackgroundColor(0x00000000);
        orbWebView.getSettings().setJavaScriptEnabled(true);
        orbWebView.loadUrl("file:///android_asset/public/orb.html");

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

    private void iniciarMonitoramentoDownloads() {
        final File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);

        if (!downloadDir.exists())
            return;

        int mask = FileObserver.CLOSE_WRITE;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            downloadObserver = new FileObserver(downloadDir, mask) {
                @Override
                public void onEvent(int event, String path) {
                    processarNovoArquivo(downloadDir, path);
                }
            };
        } else {
            downloadObserver = new FileObserver(downloadDir.getAbsolutePath(), mask) {
                @Override
                public void onEvent(int event, String path) {
                    processarNovoArquivo(downloadDir, path);
                }
            };
        }

        downloadObserver.startWatching();
    }

    private void processarNovoArquivo(File diretorio, String nomeArquivo) {
        if (nomeArquivo == null || nomeArquivo.isEmpty())
            return;

        String nomeLower = nomeArquivo.toLowerCase();
        boolean eImagem = nomeLower.endsWith(".jpg") || nomeLower.endsWith(".jpeg") || nomeLower.endsWith(".png");

        if (eImagem && !nomeArquivo.contains("_lido")) {
            File arquivoOriginal = new File(diretorio, nomeArquivo);
            if (!arquivoOriginal.exists())
                return;

            // Define o novo nome com o sufixo _lido
            int dotIndex = nomeArquivo.lastIndexOf('.');
            String nomeSemExtensao = (dotIndex == -1) ? nomeArquivo : nomeArquivo.substring(0, dotIndex);
            String extensao = (dotIndex == -1) ? "" : nomeArquivo.substring(dotIndex);
            File arquivoDestino = new File(diretorio, nomeSemExtensao + "_lido" + extensao);

            // Executa OCR e Cálculo da Corrida
            executarOcrECalculo(arquivoOriginal, arquivoDestino);
        }
    }

    private void executarOcrECalculo(File arquivoOriginal, File arquivoDestino) {
        try {
            // Notifica o Orb que a análise começou
            if (orbWebView != null) {
                orbWebView.post(() -> orbWebView.evaluateJavascript("setStatus('analyzing')", null));
            }

            InputImage image = InputImage.fromFilePath(this, Uri.fromFile(arquivoOriginal));

            textRecognizer.process(image)
                    .addOnSuccessListener(visionText -> {
                        String textoCompleto = visionText.getText();

                        // Extração dos dados da corrida por Regex
                        double valor = extrairValor(textoCompleto);
                        double km = extrairKm(textoCompleto);
                        int minutos = extrairMinutos(textoCompleto);

                        // Cálculos de rentabilidade
                        double valorPorKm = (km > 0) ? (valor / km) : 0.0;
                        double valorPorHora = (minutos > 0) ? (valor / (minutos / 60.0)) : 0.0;

                        Log.d(TAG, String.format("Cálculo: R$%.2f | %.1f km | %d min | R$/km: %.2f",
                                valor, km, minutos, valorPorKm));

                        // Atualiza o Orb no ecrã com o resultado calculado
                        if (orbWebView != null) {
                            String scriptJs = String.format(Locale.US,
                                    "setResult({valor: %.2f, km: %.2f, min: %d, valKm: %.2f, valHora: %.2f})",
                                    valor, km, minutos, valorPorKm, valorPorHora);
                            orbWebView.post(() -> orbWebView.evaluateJavascript(scriptJs, null));
                        }

                        // Envia Broadcast com os dados já calculados para o app
                        Intent intent = new Intent("GIGU_CORRIDA_CALCULADA");
                        intent.putExtra("VALOR", valor);
                        intent.putExtra("KM", km);
                        intent.putExtra("MINUTOS", minutos);
                        intent.putExtra("VALOR_POR_KM", valorPorKm);
                        intent.putExtra("VALOR_POR_HORA", valorPorHora);
                        sendBroadcast(intent);

                        // Renomeia o ficheiro após o processamento com sucesso
                        arquivoOriginal.renameTo(arquivoDestino);
                    })
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "Falha no processamento OCR", e);
                        if (orbWebView != null) {
                            orbWebView.post(() -> orbWebView.evaluateJavascript("setStatus('error')", null));
                        }
                        arquivoOriginal.renameTo(arquivoDestino);
                    });

        } catch (Exception e) {
            Log.e(TAG, "Erro ao carregar a imagem para OCR", e);
            arquivoOriginal.renameTo(arquivoDestino);
        }
    }

    // Auxiliar: Extrai o valor em dinheiro (Ex: R$ 18,50 ou 18,50)
    private double extrairValor(String texto) {
        Pattern pattern = Pattern.compile("(?:R\\$\\s?|\\b)(\\d+[.,]\\d{2})");
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            String valStr = matcher.group(1).replace(",", ".");
            try {
                return Double.parseDouble(valStr);
            } catch (Exception ignored) {
            }
        }
        return 0.0;
    }

    // Auxiliar: Extrai a distância em km (Ex: 5,4 km ou 5.4km)
    private double extrairKm(String texto) {
        Pattern pattern = Pattern.compile("(\\d+[.,]?\\d*)\\s?km", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            String kmStr = matcher.group(1).replace(",", ".");
            try {
                return Double.parseDouble(kmStr);
            } catch (Exception ignored) {
            }
        }
        return 0.0;
    }

    // Auxiliar: Extrai a duração em minutos (Ex: 12 min ou 12min)
    private int extrairMinutos(String texto) {
        Pattern pattern = Pattern.compile("(\\d+)\\s?min", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {
            }
        }
        return 0;
    }

    private void triggerScreenCapture() {
        if (orbWebView != null) {
            orbWebView.evaluateJavascript("setStatus('analyzing')", null);
        }
        Intent intent = new Intent("GIGU_TRIGGER_CAPTURE");
        sendBroadcast(intent);
    }

    private void startForegroundServiceNotification() {
        String CHANNEL_ID = "gigu_overlay_channel";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "GigU Copiloto Ativo",
                    NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("GigU Ativo")
                .setContentText("Orb de análise em execução")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build();

        startForeground(1001, notification);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (downloadObserver != null)
            downloadObserver.stopWatching();
        if (textRecognizer != null)
            textRecognizer.close();
        if (orbWebView != null && windowManager != null) {
            windowManager.removeView(orbWebView);
        }
    }
}