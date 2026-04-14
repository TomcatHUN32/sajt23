import { Header } from '../components/Header';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Vissza
        </button>

        <h1 className="font-chakra text-3xl md:text-4xl font-bold uppercase text-white mb-8">
          Adatvédelmi Tájékoztató
        </h1>

        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-zinc-300">
          <p className="text-sm text-zinc-500">Hatályos: 2026. január 1-től</p>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Adatkezelő adatai</h2>
            <p>
              <strong>Adatkezelő neve:</strong> Tuning Találkozók<br />
              <strong>E-mail:</strong> info@tuningtalalkozok.hu<br />
              <strong>Weboldal:</strong> https://tuningtalalkozok.hu
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Kezelt személyes adatok</h2>
            <p>Az alábbi személyes adatokat kezeljük:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Regisztrációkor:</strong> felhasználónév, e-mail cím, jelszó (titkosítva)</li>
              <li><strong>Profil:</strong> profilkép, borítókép, bemutatkozás (bio)</li>
              <li><strong>Tevékenység:</strong> bejegyzések, kommentek, reakciók, üzenetek</li>
              <li><strong>Technikai adatok:</strong> IP-cím, böngésző típusa, látogatás időpontja</li>
              <li><strong>Fizetési adatok:</strong> PayPal tranzakció azonosító (bankkártya adatokat NEM tárolunk)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Adatkezelés célja és jogalapja</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 text-white">Cél</th>
                  <th className="text-left py-2 text-white">Jogalap</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-800">
                  <td className="py-2">Szolgáltatás nyújtása</td>
                  <td className="py-2">Szerződés teljesítése (GDPR 6(1)(b))</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2">Felhasználói fiók kezelése</td>
                  <td className="py-2">Szerződés teljesítése (GDPR 6(1)(b))</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2">Fizetések feldolgozása</td>
                  <td className="py-2">Szerződés teljesítése (GDPR 6(1)(b))</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2">Ügyfélszolgálat</td>
                  <td className="py-2">Jogos érdek (GDPR 6(1)(f))</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2">Visszaélések megelőzése</td>
                  <td className="py-2">Jogos érdek (GDPR 6(1)(f))</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Adatmegőrzés időtartama</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Fiók adatok:</strong> a fiók törléséig</li>
              <li><strong>Bejegyzések, kommentek:</strong> törlésig vagy a fiók törléséig</li>
              <li><strong>Fizetési adatok:</strong> 8 év (számviteli kötelezettség)</li>
              <li><strong>Technikai logok:</strong> 90 nap</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Adattovábbítás</h2>
            <p>Személyes adatokat az alábbi esetekben továbbítunk:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>PayPal:</strong> fizetések feldolgozásához (EU-US adatvédelmi keretrendszer)</li>
              <li><strong>Resend:</strong> e-mail küldéshez (adatfeldolgozói szerződés alapján)</li>
              <li><strong>Hatóságok:</strong> jogszabályi kötelezettség esetén</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Cookie-k (sütik)</h2>
            <p>Az oldal az alábbi sütiket használja:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Munkamenet süti:</strong> bejelentkezés fenntartása (szükséges)</li>
              <li><strong>Preferencia süti:</strong> felhasználói beállítások tárolása</li>
            </ul>
            <p>Harmadik féltől származó analitikai sütiket NEM használunk.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">7. Az Ön jogai</h2>
            <p>A GDPR alapján Önt az alábbi jogok illetik meg:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Hozzáférés joga:</strong> tájékoztatást kérhet a kezelt adatokról</li>
              <li><strong>Helyesbítés joga:</strong> pontatlan adatok javítását kérheti</li>
              <li><strong>Törlés joga:</strong> adatai törlését kérheti ("elfeledtetéshez való jog")</li>
              <li><strong>Adathordozhatóság:</strong> adatai géppel olvasható formában való kiadását kérheti</li>
              <li><strong>Tiltakozás joga:</strong> tiltakozhat az adatkezelés ellen</li>
              <li><strong>Korlátozás joga:</strong> az adatkezelés korlátozását kérheti</li>
            </ul>
            <p className="mt-4">
              Jogai gyakorlásához írjon az <strong>info@tuningtalalkozok.hu</strong> címre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">8. Panasz</h2>
            <p>
              Ha úgy érzi, hogy megsértettük adatvédelmi jogait, panaszt tehet a Nemzeti Adatvédelmi és
              Információszabadság Hatóságnál (NAIH):
            </p>
            <p className="mt-2">
              <strong>Cím:</strong> 1055 Budapest, Falk Miksa utca 9-11.<br />
              <strong>Postacím:</strong> 1363 Budapest, Pf. 9.<br />
              <strong>Telefon:</strong> +36 1 391 1400<br />
              <strong>E-mail:</strong> ugyfelszolgalat@naih.hu<br />
              <strong>Weboldal:</strong> https://naih.hu
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">9. Adatbiztonság</h2>
            <p>
              Az adatok védelme érdekében az alábbi intézkedéseket alkalmazzuk:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>SSL/TLS titkosítás minden adatátvitelnél</li>
              <li>Jelszavak hash-elése (bcrypt algoritmus)</li>
              <li>Rendszeres biztonsági mentések</li>
              <li>Hozzáférés korlátozása</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">10. Kapcsolat</h2>
            <p>
              Adatvédelmi kérdésekkel kapcsolatban forduljon hozzánk:<br />
              <strong>E-mail:</strong> info@tuningtalalkozok.hu
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
