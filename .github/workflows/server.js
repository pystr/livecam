// server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e7 // 10 MB'ye kadar mesaj boyutuna izin ver (video kareleri için)
});

const port = 3000;

// Oda bilgilerini ve sohbet geçmişini tutacak nesne
const rooms = {}; // { odaAdi: { publisherId: 'socketId', chatHistory: [], lastFrame: 'base64data' } }

// Statik dosyaları sun
app.use(express.static(__dirname));

// Ana URL'ye yapılan GET isteğinde publisher.html dosyasını gönder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'publisher.html'));
});
app.get('/hello', (req, res) => {
    res.send('Hello, World!'); // Basit bir test mesajı
});
// /subscriber URL'ye yapılan GET isteğinde subscriber.html dosyasını gönder
app.get('/subscriber', (req, res) => {
    res.sendFile(path.join(__dirname, 'subscriber.html'));
});

io.on('connection', (socket) => {
    console.log(`Yeni bir istemci bağlandı: ${socket.id}`);

    // Oda oluşturma olayı (Yayıncıdan gelir)
    socket.on('createRoom', (roomName) => {
        if (!roomName || roomName.trim() === '') {
            socket.emit('error', 'Oda adı boş olamaz.');
            return;
        }
        const trimmedRoomName = roomName.trim();

        if (rooms[trimmedRoomName] && rooms[trimmedRoomName].publisherId) {
            // Oda zaten var ve bir yayıncıya sahip
            socket.emit('error', `Oda "${trimmedRoomName}" zaten dolu. Lütfen başka bir oda adı seçin.`);
            console.log(`Oda oluşturma hatası: "${trimmedRoomName}" zaten dolu.`);
        } else {
            // İstemciyi odaya kat
            socket.join(trimmedRoomName);
            rooms[trimmedRoomName] = { 
                publisherId: socket.id, 
                chatHistory: [],
                lastFrame: null // Son video karesini tutmak için
            };
            console.log(`Oda "${trimmedRoomName}" oluşturuldu. Yayıncı: ${socket.id}`);
            socket.emit('roomCreated', trimmedRoomName); // Yayıncıya onay gönder
            
            // Yayıncıya sohbet geçmişini gönder (şu an boş olacak)
            socket.emit('chatHistory', rooms[trimmedRoomName].chatHistory);
        }
    });

    // Odaya katılma olayı (İzleyiciden gelir)
    socket.on('joinRoom', (roomName) => {
        if (!roomName || roomName.trim() === '') {
            socket.emit('error', 'Oda adı boş olamaz.');
            return;
        }
        const trimmedRoomName = roomName.trim();

        if (rooms[trimmedRoomName]) {
            socket.join(trimmedRoomName);
            console.log(`İstemci ${socket.id} odaya katıldı: "${trimmedRoomName}"`);
            socket.emit('roomJoined', trimmedRoomName); // İzleyiciye onay gönder

            // Odaya katılan izleyiciye sohbet geçmişini gönder
            socket.emit('chatHistory', rooms[trimmedRoomName].chatHistory);

            // Eğer odada bir yayıncı varsa ve son karesi varsa, izleyiciye gönder
            if (rooms[trimmedRoomName].lastFrame) {
                socket.emit('videoFrame', rooms[trimmedRoomName].lastFrame);
            }
        } else {
            socket.emit('error', `Oda "${trimmedRoomName}" bulunamadı.`);
            console.log(`Odaya katılma hatası: Oda "${trimmedRoomName}" bulunamadı.`);
        }
    });

    // Video karesi olayı (Yayıncıdan gelir)
    socket.on('videoFrame', (data) => {
        const { room, frame } = data;
        if (room && rooms[room] && rooms[room].publisherId === socket.id) {
            // Sadece odanın yayıncısı ise kareyi yayınla
            rooms[room].lastFrame = frame; // Son kareyi kaydet
            socket.to(room).emit('videoFrame', frame); // Odaya yayınla (gönderen hariç)
        }
    });

    // Sohbet mesajı olayı
    socket.on('chatMessage', (data) => {
        const { room, message } = data;
        if (room && rooms[room]) {
            const username = `Kullanıcı_${socket.id.substring(0, 4)}`; // Basit bir kullanıcı adı
            const timestamp = new Date().toLocaleTimeString();
            const chatData = { username, message, timestamp };

            rooms[room].chatHistory.push(chatData); // Sohbet geçmişine ekle
            
            // Sohbet geçmişini çok uzamaması için sınırla (son 50 mesaj)
            if (rooms[room].chatHistory.length > 50) {
                rooms[room].chatHistory.shift();
            }

            io.to(room).emit('chatMessage', chatData); // Odaya mesajı yayınla (tüm odadakilere)
        }
    });

    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
        console.log(`İstemci bağlantısı kesildi: ${socket.id}`);
        // Bağlantısı kesilen istemcinin hangi odadan olduğunu bul ve temizle
        for (const roomName in rooms) {
            if (rooms[roomName].publisherId === socket.id) {
                console.log(`Oda "${roomName}" yayıncısı (${socket.id}) ayrıldı. Oda temizleniyor.`);
                delete rooms[roomName]; // Yayıncı ayrılınca odayı sil
                io.to(roomName).emit('publisherDisconnected', 'Yayıncı odadan ayrıldı.'); // Odaya duyuru yap
                break;
            }
        }
    });

    socket.on('error', (err) => {
        console.error(`Socket hatası (${socket.id}):`, err);
    });
});

server.listen(port, () => {
    console.log(`Web sunucusu http://localhost:${port} adresinde çalışıyor.`);
    console.log(`Yayıncı arayüzü: http://localhost:${port}`);
    console.log(`İzleyici arayüzü: http://localhost:${port}/subscriber`);
});
