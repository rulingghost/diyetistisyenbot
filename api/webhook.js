export default async function handler(req, res) {
  // GET isteği, Meta'nın (Facebook) Bot'u doğrulama adımı içindir.
  if (req.method === 'GET') {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "diyetisyen_bot_begen";
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK YAYINDA VE DOĞRULANDI!');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).json({ error: 'Doğrulama başarısız' });
      }
    }
    return res.status(400).json({ error: 'Eksik parametreler' });
  } 
  
  // POST isteği, Instagram üzerinden gelen mesajları yakaladığımız komuttur
  else if (req.method === 'POST') {
    const body = req.body;
    
    // Yalnızca Instagram mesajlarını filtrele
    if (body.object === 'instagram') {
      try {
        for (const entry of body.entry) {
          for (const messaging of entry.messaging) {
            // Mesajın içeriği bir metin ise (fotoğraf/ses değilse) cevap ver
            if (messaging.message && messaging.message.text) {
              await handleIncomingMessage(messaging.sender.id, messaging.message.text);
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error("Mesaj işlenirken hata oluştu:", error);
        return res.status(500).send('Internal Server Error');
      }
    } else {
      return res.status(404).send('Not Found');
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 📌 BOTUN VERECEĞİ YANITLARI BURADAN DÜZENLEYEBİLİRSİNİZ 📌
async function handleIncomingMessage(senderId, text) {
  const lowerText = text.toLowerCase();
  
  // Eğer hiçbir kelime tespit edilemezse verilecek standart yanıt:
  let replyText = "Merhaba! Diyetisyen danışmanlık hizmetimize hoş geldiniz.\n\nSize nasıl yardımcı olabilirim? (Örneğin: 'Fiyatlar nedir?', 'Nasıl randevu alabilirim?' veya 'Ofisiniz nerede?' diye sorabilirsiniz.)";

  // İçinde fiyat, ücret vb geçen mesajlar için:
  if (lowerText.includes('fiyat') || lowerText.includes('ücret') || lowerText.includes('ne kadar')) {
    replyText = "💰 Güncel Hizmet Fiyatlarımız:\n\n- 1 Aylık Online Diyet: 1000 TL\n- 3 Aylık Online Diyet: 2500 TL\n- Yüz Yüze Görüşme: 1500 TL / Seans\n\nDetaylı bilgi veya daha uzun süreli paketler için buradan bilgi almaya devam edebilirsiniz.";
  } 
  // İçinde randevu, takvim, kayıt geçen mesajlar için:
  else if (lowerText.includes('randevu') || lowerText.includes('takvim') || lowerText.includes('kayıt')) {
    replyText = "📅 Randevunuzu doğrudan şu link üzerinden kendinize uygun bir saat seçerek oluşturabilirsiniz: https://calendly.com/";
  } 
  // İçinde ofis, nerede, yer geçen mesajlar için:
  else if (lowerText.includes('ofis') || lowerText.includes('nerede') || lowerText.includes('adres') || lowerText.includes('yeriniz')) {
    replyText = "📍 Ofisimiz İstanbul, Kadıköy'de Moda caddesi üzerindedir.\n\nEğer şehir dışındaysanız ya da ofise gelme imkanınız yoksa, aynı verimlilikte 'Online Görüşme' hizmetimiz de mevcuttur.";
  }

  // Hazırladığımız yanıtı Meta/Instagram sistemine geri gönderiyoruz
  await sendMessage(senderId, replyText);
}

// Meta Sunucularına bağlanıp mesajı gönderen sistem fonksiyonu
async function sendMessage(recipientId, text) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  const payload = {
    recipient: { id: recipientId },
    message: { text: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Mesaj gönderilemedi. Meta API Hatası:', errorData);
    }
  } catch (error) {
    console.error('Fetch isteği başarısız oldu:', error);
  }
}
