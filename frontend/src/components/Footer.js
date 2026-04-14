import { useState } from "react";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, FileText, Shield } from "lucide-react";
import FAQModal from "./FAQModal";

export default function Footer(){

  const [faqOpen,setFaqOpen] = useState(false);

  return (
    <footer className="border-t border-white/10 bg-black pb-16 md:pb-0">

      <div className="max-w-6xl mx-auto px-4 py-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400">

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              onClick={()=>setFaqOpen(true)}
              className="hover:text-white transition"
            >
              GYIK
            </button>
            
            <Link to="/aszf" className="hover:text-white transition flex items-center gap-1">
              <FileText size={12} />
              ÁSZF
            </Link>
            
            <Link to="/adatvedelem" className="hover:text-white transition flex items-center gap-1">
              <Shield size={12} />
              Adatvédelem
            </Link>
            
            <a 
              href="mailto:info@tuningtalalkozok.hu" 
              className="hover:text-primary transition flex items-center gap-1"
            >
              <Mail size={12} />
              info@tuningtalalkozok.hu
            </a>
          </div>

          <span className="text-[11px] text-zinc-500">
            © 2026 TuningTalálkozók - Minden jog fenntartva
          </span>

          <div className="flex items-center gap-4">

            <a href="https://www.facebook.com/groups/4334237516897172/?ref=share&mibextid=wwXIfr&rdid=Wt00ZOegN3ALIY2U&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1AkwWT4jbW%2F%3Fmibextid%3DwwXIfr#" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition">
              <Facebook size={14}/>
            </a>

            <a href="https://www.instagram.com/danika_77" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition">
              <Instagram size={14}/>
            </a>

            <a href="https://tiktok.com/@daniika_77" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              TikTok
            </a>

          </div>

        </div>
        
      </div>

      <FAQModal open={faqOpen} onClose={()=>setFaqOpen(false)} />

    </footer>
  );
}
