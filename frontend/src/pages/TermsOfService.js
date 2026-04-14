import { Header } from '../components/Header';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsOfService = () => {
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
          Általános Szerződési Feltételek
        </h1>

        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-zinc-300">
          <p className="text-sm text-zinc-500">Hatályos: 2026. január 1-től</p>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Szolgáltató adatai</h2>
            <p>
              <strong>Szolgáltató neve:</strong> Tuning Találkozók<br />
              <strong>Székhely:</strong> Magyarország<br />
              <strong>E-mail:</strong> info@tuningtalalkozok.hu<br />
              <strong>Weboldal:</strong> https://tuningtalalkozok.hu
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">2. A szolgáltatás leírása</h2>
            <p>
              A Tuning Találkozók egy közösségi platform, amely lehetővé teszi a felhasználók számára, hogy:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Regisztráljanak és profilt hozzanak létre</li>
              <li>Bejegyzéseket és képeket osszanak meg</li>
              <li>Eseményeket hozzanak létre és azokra jelentkezzenek</li>
              <li>Más felhasználókkal kapcsolatba lépjenek</li>
              <li>Egyenleget töltsenek fel PayPal-on keresztül</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Regisztráció és fiók</h2>
            <p>
              A szolgáltatás használatához regisztráció szükséges. A felhasználó köteles valós adatokat megadni.
              A fiók személyes, annak átadása harmadik félnek tilos.
            </p>
            <p>
              A szolgáltató fenntartja a jogot, hogy a szabályzatot megszegő fiókokat felfüggessze vagy törölje.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Fizetési feltételek</h2>
            <p>
              Az oldalon elérhető fizetős szolgáltatások (pl. esemény kiemelés) PayPal-on keresztül fizethetők.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>A fizetés a PayPal felületén történik biztonságos módon</li>
              <li>A feltöltött egyenleg nem visszaváltható készpénzre</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Felhasználói tartalom</h2>
            <p>
              A felhasználók által feltöltött tartalmakért (képek, szövegek, videók) a felhasználó felel.
              Tilos jogellenes, sértő, vagy mások jogait sértő tartalom feltöltése.
            </p>
            <p>
              A szolgáltató fenntartja a jogot a szabálysértő tartalmak moderálására és törlésére.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Felelősség korlátozása</h2>
            <p>
              A szolgáltató nem vállal felelősséget:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>A felhasználók által közzétett tartalmakért</li>
              <li>A felhasználók közötti vitákért</li>
              <li>Technikai hibákból eredő adatvesztésért</li>
              <li>A harmadik fél szolgáltatásaiért (pl. PayPal)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">7. Szerzői jogok</h2>
            <p>
              Az oldal dizájnja, logója és tartalma a szolgáltató szellemi tulajdonát képezi.
              A felhasználók által feltöltött tartalmak szerzői joga a felhasználóké marad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">8. Módosítások</h2>
            <p>
              A szolgáltató fenntartja a jogot az ÁSZF módosítására. A módosításokról a felhasználókat
              értesítjük. A szolgáltatás további használata a módosítások elfogadását jelenti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">9. Kapcsolat</h2>
            <p>
              Kérdés vagy panasz esetén kérjük, lépjen kapcsolatba velünk:<br />
              <strong>E-mail:</strong> info@tuningtalalkozok.hu
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mt-8 mb-4">10. Alkalmazandó jog</h2>
            <p>
              Jelen ÁSZF-re a magyar jog az irányadó. Vitás esetben a magyar bíróságok illetékesek.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
