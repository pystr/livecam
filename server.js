// server.js (Örnek)
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs'); // Sertifika dosyalarını okumak için
const https = require('https'); // HTTPS modülü

// SSL Sertifika Yolları (Kendi sertifika yollarınızla değiştirin)
const privateKey = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/yourdomain.com/chain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate, ca: ca };

const httpsServer = https.createServer(credentials, app);
const io = require('socket.io')(httpsServer); // Socket.IO'yu HTTPS sunucusuna bağla

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'))); // Statik dosyalarınızın olduğu dizin

// Ana sayfayı sun
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'publisher.html'));
});
// server.js dosyanızda, diğer app.get() tanımlamalarının altına veya üstüne ekleyebilirsiniz.

app.get('/hello', (req, res) => {
    res.send('Merhaba, sunucu çalışıyor!');
});
// Abone sayfasını sun
app.get('/subscriber', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'subscriber.html'));
});

// Siren sesi için statik yol (eğer public klasöründe değilse)
// Eğer siren.mp3 public klasörünüzdeyse bu satıra gerek yok.
// app.get('/siren.mp3', (req, res) => {
//     res.sendFile(path.join(__dirname, 'siren.mp3'));
// });

// ... (Socket.IO bağlantı ve oda yönetimi kodlarınız buraya gelecek) ...
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('createRoom', (roomName) => {
        // ... (Oda oluşturma mantığı) ...
    });

    socket.on('joinRoom', (roomName) => {
        // ... (Odaya katılma mantığı) ...
    });

    socket.on('videoFrame', (data) => {
        // ... (Video karesi gönderme mantığı) ...
    });

    socket.on('disconnect', () => {
        // ... (Bağlantı kesme mantığı) ...
    });
});


httpsServer.listen(PORT, () => {
    console.log(`HTTPS Sunucusu ${PORT} portunda çalışıyor.`);
});
