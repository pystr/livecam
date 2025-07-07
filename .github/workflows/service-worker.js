// service-worker.js

const CACHE_NAME = 'video-viewer-cache-v1'; // Önbellek adı ve versiyonu
const urlsToCache = [
    '/subscriber', // İzleyici sayfasının başlangıç URL'si
    '/subscriber.html', // İzleyici HTML dosyası
    '/socket.io/socket.io.js', // Socket.IO istemci kütüphanesi
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js', // TensorFlow.js
    'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd', // COCO-SSD modeli
    // Modelin diğer dosyaları da önbelleğe alınmalıdır, ancak bu URL otomatik olarak yüklenir.
    // Eğer özel simgeleriniz varsa onları da buraya ekleyin:
    // '/icons/icon-192x192.png',
    // '/icons/icon-512x512.png'
];

// Yükleme (install) olayı: Service Worker yüklendiğinde tetiklenir
self.addEventListener('install', (event) => {
    console.log('Service Worker: Yükleniyor...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Önbelleğe dosyalar ekleniyor.');
                return cache.addAll(urlsToCache); // Tanımlanan URL'leri önbelleğe al
            })
            .catch(err => {
                console.error('Service Worker: Önbelleğe alma hatası:', err);
            })
    );
});

// Aktifleştirme (activate) olayı: Service Worker aktifleştiğinde tetiklenir
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Aktifleşiyor...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Eski önbellekleri sil
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eski önbellek siliniyor:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Service Worker'ın hemen kontrolü ele almasını sağlar
    self.clients.claim();
});

// Fetch olayı: Ağ istekleri yakalandığında tetiklenir
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request) // İsteğin önbellekte olup olmadığını kontrol et
            .then((response) => {
                // Önbellekte varsa önbellekten dön
                if (response) {
                    return response;
                }
                // Önbellekte yoksa ağı kullan ve yeni isteği önbelleğe al
                return fetch(event.request).then(
                    (response) => {
                        // Geçersiz yanıtları önbelleğe alma
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Yanıtı klonla çünkü bir kez kullanıldıktan sonra değiştirilemez
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache); // İsteği ve yanıtı önbelleğe al
                            });
                        return response;
                    }
                );
            })
            .catch((error) => {
                console.error('Service Worker: Fetch hatası:', error);
                // Çevrimdışı durumda veya hata durumunda bir fallback sayfası gösterebilirsiniz
                // Örneğin: return caches.match('/offline.html');
            })
    );
});
