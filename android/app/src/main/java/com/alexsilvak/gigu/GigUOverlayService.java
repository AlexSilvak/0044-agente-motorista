package com.alexsilvak.gigu;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.FileObserver;
import android.os.IBinder;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.app.NotificationCompat;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.File;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GigUOverlayService extends Service implements TextToSpeech.OnInitListener {
    private static final String TAG = "GigUOverlayService";
    private static final String CHANNEL_ID = "gigu_overlay_channel";
    
    // Custo estimado do veículo por KM (combustível + manutenção)
    private static final double CUSTO_POR_KM = 0.70; 

    // Opções de Automação (podem ser alteradas via preferências)
    private boolean notificacaoTextoHabilitada = true;
    private boolean notificacaoVozHabilitada = true;
    private boolean mensagemPassageiroHabilitada = true;

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private WebView orbWebView;
    private FileObserver downloadObserver;
    private TextRecognizer textRecognizer;
    private TextToSpeech tts;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundServiceNotification();

        // Inicializa OCR e Sintetizador de Voz (TTS)
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        tts = new TextToSpeech(this, this);

        iniciarMonitoramentoDownloads();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 50;
        params.y = 250;

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

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(new Locale("pt", "BR"));
        }
    }

    private void iniciarMonitoramentoDownloads() {
        final File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadDir.exists()) return;

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
        if (nomeArquivo == null || nomeArquivo.isEmpty()) return;

        String nomeLower = nomeArquivo.toLowerCase();
        boolean eImagem = nomeLower.endsWith(".jpg") || nomeLower.endsWith(".jpeg") || nomeLower.endsWith(".png");

        if (eImagem && !nomeArquivo.contains("_lido")) {
            File arquivoOriginal = new File(diretorio, nomeArquivo);
            if (!arquivoOriginal.exists()) return;

            int dotIndex = nomeArquivo.lastIndexOf('.');
            String nomeSemExtensao = (dotIndex == -1) ? nomeArquivo : nomeArquivo.substring(0, dotIndex);
            String extensao = (dotIndex == -1) ? "" : nomeArquivo.substring(dotIndex);
            File arquivoDestino = new File(diretorio, nomeSemExtensao + "_lido" + extensao);

            executarOcrECalculo(arquivoOriginal, arquivoDestino);
        }
    }

    private void executarOcrECalculo(File arquivoOriginal, File arquivoDestino) {
        try {
            if (orbWebView != null) {
                orbWebView.post(() -> orbWebView.evaluateJavascript("setStatus('analyzing')", null));
            }

            InputImage image = InputImage.fromFilePath(this, Uri.fromFile(arquivoOriginal));

            textRecognizer.process(image)
                .addOnSuccessListener(visionText -> {
                    String textoCompleto = visionText.getText();

                    // Extração de métricas
                    double valor = extrairValor(textoCompleto);
                    double km = extrairKm(textoCompleto);
                    int minutos = extrairMinutos(textoCompleto);
                    double nota = extrairNota(textoCompleto);

                    // Cálculos de Rentabilidade
                    double valorPorKm = (km > 0) ? (valor / km) : 0.0;
                    double valorPorHora = (minutos > 0) ? (valor / (minutos / 60.0)) : 0.0;
                    double custoEstimado = km * CUSTO_POR_KM;
                    double lucroR$ = valor - custoEstimado;
                    double percentualLucro = (valor > 0) ? (lucroR$ / valor) * 100.0 : 0.0;

                    // 1. Atualizar HUD / Card no Orb
                    if (orbWebView != null) {
                        String scriptJs = String.format(Locale.US,
                            "setResult({valor: %.2f, km: %.2f, min: %d, valKm: %.2f, valHora: %.2f, lucroPct: %.1f, nota: %.2f})",
                            valor, km, minutos, valorPorKm, valorPorHora, percentualLucro, nota);
                        orbWebView.post(() -> orbWebView.evaluateJavascript(scriptJs, null));
                    }

                    // 2. Notificação de Voz
                    if (notificacaoVozHabilitada && tts != null) {
                        String fala = String.format(Locale.getDefault(), 
                            "Corrida de %.2f reais. %.2f reais por quilômetro. Lucro de %.0f por cento.", 
                            valor, valorPorKm, percentualLucro);
                        tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "GIGU_TTS");
                    }

                    // 3. Notificação de Texto no Sistema
                    if (notificacaoTextoHabilitada) {
                        exibirNotificacaoCorrida(valor, valorPorKm, valorPorHora, percentualLucro, nota);
                    }

                    // 4. Copiar Mensagem Padrão para Área de Transferência
                    if (mensagemPassageiroHabilitada) {
                        copiarMensagemPassageiro();
                    }

                    // Transmitir Broadcast para o React / App
                    Intent intent = new Intent("GIGU_CORRIDA_CALCULADA");
                    intent.putExtra("VALOR", valor);
                    intent.putExtra("KM", km);
                    intent.putExtra("MINUTOS", minutos);
                    intent.putExtra("VALOR_POR_KM", valorPorKm);
                    intent.putExtra("VALOR_POR_HORA", valorPorHora);
                    intent.putExtra("PERCENTUAL_LUCRO", percentualLucro);
                    intent.putExtra("NOTA", nota);
                    sendBroadcast(intent);

                    arquivoOriginal.renameTo(arquivoDestino);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Falha no OCR", e);
                    if (orbWebView != null) {
                        orbWebView.post(() -> orbWebView.evaluateJavascript("setStatus('error')", null));
                    }
                    arquivoOriginal.renameTo(arquivoDestino);
                });

        } catch (Exception e) {
            Log.e(TAG, "Erro ao carregar imagem", e);
            arquivoOriginal.renameTo(arquivoDestino);
        }
    }

    private double extrairValor(String texto) {
        Pattern pattern = Pattern.compile("(?:R\\$\\s?|\\b)(\\d+[.,]\\d{2})");
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            String valStr = matcher.group(1).replace(",", ".");
            try { return Double.parseDouble(valStr); } catch (Exception ignored) {}
        }
        return 0.0;
    }

    private double extrairKm(String texto) {
        Pattern pattern = Pattern.compile("(\\d+[.,]?\\d*)\\s?km", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            String kmStr = matcher.group(1).replace(",", ".");
            try { return Double.parseDouble(kmStr); } catch (Exception ignored) {}
        }
        return 0.0;
    }

    private int extrairMinutos(String texto) {
        Pattern pattern = Pattern.compile("(\\d+)\\s?min", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            try { return Integer.parseInt(matcher.group(1)); } catch (Exception ignored) {}
        }
        return 0;
    }

    private double extrairNota(String texto) {
        Pattern pattern = Pattern.compile("(?:★|nota)?\\s?([3-5][.,]\\d{1,2})", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(texto);
        if (matcher.find()) {
            String notaStr = matcher.group(1).replace(",", ".");
            try { return Double.parseDouble(notaStr); } catch (Exception ignored) {}
        }
        return 5.0; // Padrão
    }

    private void exibirNotificacaoCorrida(double valor, double valKm, double valHora, double lucroPct, double nota) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String titulo = String.format(Locale.getDefault(), "R$ %.2f | R$ %.2f/km", valor, valKm);
        String conteudo = String.format(Locale.getDefault(), "R$/Hora: R$ %.2f | Lucro: %.0f%% | Nota: %.2f", valHora, lucroPct, nota);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(titulo)
                .setContentText(conteudo)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build();

        nm.notify(1002, notification);
    }

    private void copiarMensagemPassageiro() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("GigU Msg", "Olá! Sou seu motorista GigU e já estou a caminho do seu local de embarque.");
        if (clipboard != null) {
            clipboard.setPrimaryClip(clip);
        }
    }

    private void triggerScreenCapture() {
        if (orbWebView != null) {
            orbWebView.evaluateJavascript("setStatus('analyzing')", null);
        }
        Intent intent = new Intent("GIGU_TRIGGER_CAPTURE");
        sendBroadcast(intent);
    }

    private void startForegroundServiceNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "GigU Copiloto Ativo",
                    NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("GigU Copiloto Ativo")
                .setContentText("Análise de corridas em execução")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build();

        startForeground(1001, notification);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (downloadObserver != null) downloadObserver.stopWatching();
        if (textRecognizer != null) textRecognizer.close();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (orbWebView != null && windowManager != null) {
            windowManager.removeView(orbWebView);
        }
    }
}