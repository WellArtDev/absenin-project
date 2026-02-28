# Fonnte Webhook Configuration

## Webhook URL

Gunakan URL ini di dashboard Fonnte:

```
https://yourdomain.com/api/webhook/fonnte
```

Untuk local development:
```
http://localhost:3001/api/webhook/fonnte
```

## Format Data Fonnte

Fonnte akan mengirim data dengan format berikut ke webhook:

### Text Message
```json
{
  "sender": "628123456789",
  "message": "HADIR",
  "device": "08123456789"
}
```

### Image Message
```json
{
  "sender": "628123456789",
  "message": "HADIR",
  "type": "image",
  "url": "https://server.fonnte.com/image.php...",
  "device": "08123456789"
}
```

### Location Message
```json
{
  "sender": "628123456789",
  "message": "HADIR",
  "location": {
    "latitude": -6.2088,
    "longitude": 106.8456
  },
  "device": "08123456789"
}
```

## Perintah yang Didukung

| Perintah | Deskripsi |
|----------|-----------|
| `HADIR`, `MASUK`, `CHECKIN`, `IN`, `ABSEN` | Check-in (absen masuk) |
| `PULANG`, `KELUAR`, `CHECKOUT`, `OUT` | Check-out (absen pulang) |
| `STATUS`, `CEK`, `INFO` | Cek status absen hari ini |
| `IZIN` | Tandai izin |
| `SAKIT` | Tandai sakit |
| `LEMBUR` | Mulai lembur |
| `SELESAI LEMBUR` | Selesai lembur |
| `REKAP` | Rekap lembur bulan ini |

## Konfigurasi Database

Pastikan `company_settings` sudah diisi:

```sql
UPDATE company_settings
SET
    wa_api_url = 'https://api.fonnte.com/send',
    wa_api_token = 'TOKEN_FONNTE_ANDA',
    wa_device_number = '08123456789'  -- Nomor bot Fonnte
WHERE company_id = 1;
```

## Testing

Test webhook dari command line:

```bash
# Test text message
node test-webhook.js 628123456789 HADIR

# Test dengan environment variable
FONNTE_WEBHOOK_URL=https://yourdomain.com/api/webhook/fonnte \
  node test-webhook.js 628123456789 HADIR
```

Atau gunakan curl:

```bash
curl -X POST https://yourdomain.com/api/webhook/fonnte \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "628123456789",
    "message": "HADIR",
    "device": "08123456789"
  }'
```

## Troubleshooting

### Tidak ada respon dari bot

1. **Cek Log Backend**
   ```bash
   pm2 logs absenin-backend
   ```

2. **Cek Konfigurasi**
   ```bash
   psql -U postgres -d absenin -f database/check-wa-config.sql
   ```

3. **Test Manual**
   ```bash
   node test-webhook.js 628123456789 HADIR
   ```

### Employee tidak ditemukan

Pastikan nomor HP employee terdaftar di database:
```sql
SELECT name, phone_number, is_active
FROM employees
WHERE phone_number LIKE '%628123456789%';
```

### Pesan terkirim tapi tidak ada balasan

Cek apakah `wa_api_token` valid dan nomor device sudah benar.

Log akan menunjukkan:
```
📱 WA SENDING [C:1] → 628123456789
📱 WA RESPONSE [200]: {...}
```

## Endpoint Lain

- `GET /api/webhook/fonnte` - Cek status webhook
- `POST /api/webhook/fonnte/test` - Test endpoint (hanya development)
- `GET /api/health` - Cek health API
