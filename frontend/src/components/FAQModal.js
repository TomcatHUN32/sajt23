import { useState } from "react";
import { X, ChevronDown } from "lucide-react";

export default function FAQModal({ open, onClose }) {

  const [active, setActive] = useState(null);

  if (!open) return null;

  const faqs = [
    {
      q: "Hogyan regisztrálhatok?",
      a: "A regisztrációhoz kattints a regisztráció gombra és töltsd ki az adatokat. Regisztráció után, erősítsd meg az e-mail címed, mert ha ezt nem teszed meg, másodjára nem fogsz tudni belépni."
    },
    {
      q: "Hogyan hozhatok létre eseményt?",
      a: "Az események menüpont alatt hozhatsz létre új találkozót."
    },
    {
      q: "Mi az admin jóváhagyás?",
      a: "Az admin ellenőrzi az eseményeket publikálás előtt."
    },
    {
      q: "Hogyan jelölhetek ismerősöket?",
      a: "A keresés mezőben keres a becenevére, és jelöld be."
    },
    {
      q: "Hogyan tölthetem fel a tárcámat?",
      a: "Lépj a tárcádra, és ott indíts feltöltést."
    },
    {
      q: "Milyen fizetési lehetőség van?",
      a: "Jelenleg még most csak PayPal fizetéssel lehetséges a tárcádat feltölteni."
    },
    {
      q: "Mennyi idő mire megérkezik a tárcámra a feltöltött összeg?",
      a: "24 órán belül kerül jóváírásra, miután az admin ellenőrizte a fizetésedet, és a közleménybe be írtad a közleményed szövegét!"
    },


	
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

      <div className="bg-zinc-900 w-full max-w-lg rounded-xl p-6">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">GYIK</h2>

          <button onClick={onClose}>
            <X className="text-zinc-400 hover:text-white"/>
          </button>
        </div>

        <div className="space-y-3">

          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/10 rounded-lg">

              <button
                onClick={() => setActive(active === i ? null : i)}
                className="w-full flex justify-between px-4 py-3 text-white text-sm hover:bg-zinc-800"
              >
                {faq.q}
                <ChevronDown className={`${active === i ? "rotate-180" : ""}`} />
              </button>

              {active === i && (
                <div className="px-4 pb-3 text-zinc-400 text-sm">
                  {faq.a}
                </div>
              )}

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}