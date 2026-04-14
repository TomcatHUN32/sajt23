import { useState, useEffect, useMemo } from "react";
import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../components/ui/dialog";

import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  DollarSign,
  Banknote,
  Plus,
  Check,
  X,
  Upload,
  Zap,
  Star,
  Search,
  BadgeCheck,
  Clock3,
  Filter,
  ChevronDown,
  ExternalLink,
  Navigation
} from "lucide-react";

import { format } from "date-fns";
import { hu } from "date-fns/locale";

export const Events = () => {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [showOnlyOfficial, setShowOnlyOfficial] = useState(false);
  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(false);

  const [now, setNow] = useState(Date.now());
  
  const [expandedEvents, setExpandedEvents] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    end_date: "",
    city: "",
    address: "",
    entry_fee: 0,
    is_official: false,
    image_base64: ""
  });

  useEffect(() => {
    fetchEvents();

    const refresh = setInterval(() => {
      fetchEvents();
    }, 15000);

    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const safeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

const getEffectiveEndDate = (event) => {

  const explicitEnd =
    safeDate(event.end_date) ||
    safeDate(event.endDate) ||
    safeDate(event.end);

  if (explicitEnd) return explicitEnd;

  const start = safeDate(event.date);
  if (!start) return null;

  return new Date(start.getTime() + 6 * 60 * 60 * 1000);
};
  const isEventExpired = (event) => {
    const current = new Date(now);
    const end = getEffectiveEndDate(event);
    if (!end) return false;
    return end <= current;
  };

  const isEventLive = (event) => {
    const current = new Date(now);
    const start = safeDate(event.date);
    const end = getEffectiveEndDate(event);

    if (!start || !end) return false;
    return current >= start && current < end;
  };

  const isEventSoon = (event) => {
    const current = new Date(now);
    const start = safeDate(event.date);

    if (!start) return false;
    if (current >= start) return false;

    const diff = start.getTime() - current.getTime();
    return diff <= 60 * 60 * 1000;
  };

  const getEventStatus = (event) => {
    if (isEventExpired(event)) return "ENDED";
    if (isEventLive(event)) return "LIVE";
    if (isEventSoon(event)) return "SOON";
    return "UPCOMING";
  };

  const getEventStatusLabel = (event) => {
    const status = getEventStatus(event);

    if (status === "LIVE") return "Élő esemény";
    if (status === "SOON") return "Hamarosan";
    if (status === "ENDED") return "Lejárt";
    return "Közelgő esemény";
  };

  const getEventStatusClasses = (event) => {
    const status = getEventStatus(event);

    if (status === "LIVE") {
      return "bg-red-500/15 border border-red-500/25 text-red-400";
    }

    if (status === "SOON") {
      return "bg-yellow-500/15 border border-yellow-500/25 text-yellow-400";
    }

    if (status === "ENDED") {
      return "bg-zinc-500/15 border border-zinc-500/25 text-zinc-400";
    }

    return "bg-blue-500/15 border border-blue-500/25 text-blue-400";
  };

  const formatDateSafe = (value, pattern = "yyyy. MMM d. HH:mm") => {
    const date = safeDate(value);
    if (!date) return "Érvénytelen dátum";
    return format(date, pattern, { locale: hu });
  };

  const getGoogleMapsUrl = (city, address) => {
    const cleanAddress = address?.trim();

    const query = cleanAddress
      ? `${cleanAddress}, ${city}`
      : city;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};
  const renderDescription = (text) => {
    if (!text) return null;
    
    // URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-orange-400 underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get("/events");
      setEvents(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Nem sikerült betölteni az eseményeket");
    } finally {
      setLoading(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1400;

          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(event.target.result);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Csak képfájl tölthető fel");
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      toast.error("A kép maximum 80 MB lehet");
      return;
    }

    const compressed = await compressImage(file);

    setFormData((prev) => ({
      ...prev,
      image_base64: compressed
    }));

    setImagePreview(compressed);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    try {
      await api.post("/events", formData);

      toast.success("Esemény létrehozva! Admin jóváhagyásra vár.");

      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        date: "",
        end_date: "",
        city: "",
        address: "",
        entry_fee: 0,
        is_official: false,
        image_base64: ""
      });
      setImagePreview(null);

      fetchEvents();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Hiba történt");
    }
  };

  const handleRSVP = async (eventId, status) => {
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      toast.success("Válasz rögzítve");
      fetchEvents();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Hiba történt");
    }
  };

  const handleHighlight = async (eventId) => {
    if (!window.confirm("A kiemelés 1000 Ft-ba kerül. Folytatod?")) return;

    try {
      await api.post(`/events/${eventId}/highlight`);
      toast.success("Kiemelési kérelem elküldve");
      fetchEvents();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Hiba történt");
    }
  };
  const cities = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          events
            .map((event) => event.city)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "hu"))
        )
      )
    ];
  }, [events]);

const highlightedEvents = useMemo(() => {
  return events.filter((event) => {
    if (!event.highlighted) return false;

    // lejárt esemény ne jelenjen meg
    if (isEventExpired(event)) return false;

    return true;
  });
}, [events, now]);

  useEffect(() => {
    if (highlightedEvents.length <= 1) return;

    if (currentSlide > highlightedEvents.length - 1) {
      setCurrentSlide(0);
    }

    const slider = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % highlightedEvents.length);
    }, 5000);

    return () => clearInterval(slider);
  }, [highlightedEvents, currentSlide]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (isEventExpired(event)) return false;

      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        event.title?.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q) ||
        event.city?.toLowerCase().includes(q);

      const matchesCity =
        selectedCity === "all" || event.city === selectedCity;

      const matchesOfficial = !showOnlyOfficial || event.is_official;
      const matchesHighlighted = !showOnlyHighlighted || event.highlighted;

      return (
        matchesSearch &&
        matchesCity &&
        matchesOfficial &&
        matchesHighlighted
      );
    });
  }, [events, search, selectedCity, showOnlyOfficial, showOnlyHighlighted, now]);

  const getCountdown = (dateString) => {
    const current = new Date(now);
    const target = safeDate(dateString);

    if (!target) return "Érvénytelen dátum";

    const diff = target.getTime() - current.getTime();

    if (diff <= 0) return "Már elkezdődött";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days} nap ${hours} óra ${minutes} perc`;
    if (hours > 0) return `${hours} óra ${minutes} perc ${seconds} mp`;
    if (minutes > 0) return `${minutes} perc ${seconds} mp`;
    return `${seconds} mp`;
  };

  const getUntilEnd = (event) => {
    const current = new Date(now);
    const end = getEffectiveEndDate(event);

    if (!end) return "Nincs megadva";
    if (end <= current) return "Lejárt";

    const diff = end.getTime() - current.getTime();
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days} nap ${hours} óra`;
    if (hours > 0) return `${hours} óra ${minutes} perc`;
    if (minutes > 0) return `${minutes} perc ${seconds} mp`;
    return `${seconds} mp`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-orange-300 mb-4">
              <Zap className="h-3.5 w-3.5" />
              Premium Events
            </div>

            <h1 className="font-chakra text-4xl md:text-5xl font-bold uppercase text-white">
              Események
            </h1>

            <p className="text-zinc-400 mt-3 max-w-2xl">
              Találd meg a következő tuning találkozót, vagy hozz létre saját eseményt.
            </p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-orange-600 uppercase font-bold shadow-lg shadow-orange-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Új esemény
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl uppercase font-chakra">
                  Esemény létrehozása
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateEvent} className="space-y-5" noValidate>
                <div>
                  <Label>Cím</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Leírás</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                    required
                    className="min-h-[120px]"
                  />
                </div>

                <div>
                  <Label>Esemény kép</Label>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center hover:border-primary transition"
                  >
                    <Upload className="mx-auto mb-2 opacity-70" />

                    <p className="text-sm text-zinc-400">
                      Húzz ide egy képet vagy válassz fájlt
                    </p>

                    <Input
                      type="file"
                      accept="image/*"
                      className="mt-3"
                      onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    />
                  </div>

                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Előnézet"
                      className="mt-4 rounded-lg max-h-60 object-cover"
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Dátum</Label>
                    <Input
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label>Vége</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label>Város</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="pl. Budapest"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Pontos cím (opcionális)</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="pl. Váci út 123."
                  />
                </div>

                <div>
                  <Label>Belépő (Ft)</Label>
                  <Input
                    type="number"
                    value={formData.entry_fee}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        entry_fee: Number(e.target.value)
                      }))
                    }
                    required
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_official}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_official: e.target.checked
                      }))
                    }
                  />
                  <Label>Bejelentett esemény?</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-orange-600 uppercase font-bold"
                >
                  Létrehozás
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {highlightedEvents.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 text-orange-400 mb-4 uppercase tracking-widest text-sm font-semibold">
              <Star className="h-4 w-4" />
              Kiemelt események
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-zinc-900 shadow-[0_0_40px_rgba(249,115,22,0.15)]">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {highlightedEvents.map((event) => {
                  const start = safeDate(event.date);
                  const end = getEffectiveEndDate(event);

                  return (
                    <div key={event.event_id} className="min-w-full relative">
                      {event.image_base64 ? (
                        <img
                          src={event.image_base64}
                          alt={event.title}
                          className="w-full h-[360px] object-cover"
                        />
                      ) : (
                        <div className="w-full h-[360px] bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                        <div className="flex flex-wrap gap-2 mb-4">

                          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 border border-orange-400/20 px-3 py-1 text-orange-300 text-xs font-semibold uppercase">
                            <Zap className="h-3.5 w-3.5" />
                            Kiemelt
                          </div>

                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getEventStatusClasses(event)}`}
                          >
                            {getEventStatusLabel(event)}
                          </div>

                        </div>

                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                          {event.title}
                        </h2>

                        <p className="text-zinc-200 max-w-3xl mb-5 line-clamp-3">
                          {event.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm text-zinc-200">

                          <span className="flex items-center gap-2">
                            <Calendar size={16} />
                            {formatDateSafe(event.date)}
                          </span>

                          {end && (
                            <span className="flex items-center gap-2">
                              <Clock3 size={16} />
                              Vége: {formatDateSafe(end)}
                            </span>
                          )}

                          <span className="flex items-center gap-2">
                            <MapPin size={16} />
                            {event.city}
                          </span>

                          <span className="flex items-center gap-2">
                            <DollarSign size={16} />
                            {event.entry_fee} Ft
                          </span>

                          <span className="flex items-center gap-2 text-orange-300">
                            <Clock3 size={16} />
                            Kezdésig: {getCountdown(event.date)}
                          </span>

                          <span className="flex items-center gap-2 text-red-300">
                            <Clock3 size={16} />
                            Végéig: {getUntilEnd(event)}
                          </span>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {highlightedEvents.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide((prev) =>
                        prev === 0 ? highlightedEvents.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white px-3 py-2"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlide(
                        (prev) => (prev + 1) % highlightedEvents.length
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white px-3 py-2"
                  >
                    ›
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {highlightedEvents.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`h-2.5 rounded-full transition-all ${
                          currentSlide === index
                            ? "w-8 bg-orange-500"
                            : "w-2.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4 md:p-5 mb-8">
          <div className="flex items-center gap-2 text-white mb-4 uppercase tracking-widest text-xs">
            <Filter className="h-4 w-4" />
            Szűrők
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés cím, leírás vagy város alapján..."
                className="pl-10"
              />
            </div>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === "all" ? "Összes város" : city}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-4 rounded-md border border-input bg-background px-3 py-2">

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyOfficial}
                  onChange={(e) => setShowOnlyOfficial(e.target.checked)}
                />
                Hivatalos
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyHighlighted}
                  onChange={(e) => setShowOnlyHighlighted(e.target.checked)}
                />
                Kiemelt
              </label>

            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/5 bg-zinc-900 p-4 animate-pulse"
              >
                <div className="h-48 rounded-xl bg-zinc-800 mb-4" />
                <div className="h-6 w-2/3 bg-zinc-800 rounded mb-3" />
                <div className="h-4 w-1/2 bg-zinc-800 rounded mb-2" />
                <div className="h-4 w-1/3 bg-zinc-800 rounded mb-2" />
                <div className="h-4 w-1/4 bg-zinc-800 rounded mb-4" />
                <div className="h-16 bg-zinc-800 rounded mb-4" />
                <div className="h-10 bg-zinc-800 rounded" />
              </div>
            ))}

          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-400">
            Nincs találat a megadott szűrőkkel.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

            {filteredEvents.map((event) => {
              const totalResponses =
                (event.going_count || 0) + (event.not_going_count || 0);

              const goingPercent =
                totalResponses > 0
                  ? ((event.going_count || 0) / totalResponses) * 100
                  : 0;

              const start = safeDate(event.date);
              const end = getEffectiveEndDate(event);

              return (
                <Card
                  key={event.event_id}
                  className={`bg-zinc-900 border border-white/5 hover:border-primary transition hover:scale-[1.02] overflow-hidden shadow-lg ${
                    event.highlighted
                      ? "ring-2 ring-orange-500 shadow-orange-500/30"
                      : ""
                  }`}
                >

                  {event.image_base64 && (
                    <img
                      src={event.image_base64}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                  )}

                  <CardHeader>

                    <div className="flex items-start justify-between gap-3">

                      <h3 className="text-xl font-bold text-white leading-tight">
                        {event.title}
                      </h3>

                      {event.highlighted && (
                        <div className="shrink-0 rounded-full bg-orange-500/15 border border-orange-500/20 px-2 py-1 text-orange-400 text-xs font-semibold">
                          Kiemelt
                        </div>
                      )}

                    </div>

                    <div className="text-sm text-zinc-400 space-y-2 mt-2">

                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        {formatDateSafe(event.date)}
                      </div>

                      {end && (
                        <div className="flex items-center gap-2">
                          <Clock3 size={16} />
                          Vége: {formatDateSafe(end)}
                        </div>
                      )}

                      <a 
                        href={getGoogleMapsUrl(event.city, event.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <MapPin size={16} />
                        {event.address ? `${event.address}, ${event.city}` : event.city}
                        <Navigation size={12} className="text-primary" />
                      </a>

                      <div className="flex items-center gap-2">
                        <Banknote size={16} />
                        {event.entry_fee} Ft
                      </div>

                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getEventStatusClasses(
                          event
                        )}`}
                      >
                        {getEventStatusLabel(event)}
                      </div>

                      {event.is_official && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-green-400 text-xs font-semibold">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Bejelentett esemény
                        </div>
                      )}

                    </div>
                  </CardHeader>

                  <CardContent>

                    <div className={`text-sm text-zinc-300 mb-4 min-h-[80px] whitespace-pre-wrap ${!expandedEvents[event.event_id] ? 'line-clamp-4' : ''}`}>
                      {renderDescription(event.description)}
                    </div>
                    
                    {event.description && event.description.length > 200 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEvents(prev => ({
                          ...prev,
                          [event.event_id]: !prev[event.event_id]
                        }))}
                        className="text-primary hover:text-orange-400 mb-3 p-0 h-auto"
                      >
                        <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${expandedEvents[event.event_id] ? 'rotate-180' : ''}`} />
                        {expandedEvents[event.event_id] ? 'Kevesebb' : 'Bővebben'}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEvent(event)}
                      className="w-full mb-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Teljes esemény megtekintése
                    </Button>

                    <div className="mb-3">
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${goingPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm mb-4">

                      <span className="text-green-400">
                        {event.going_count || 0} fő ott lesz
                      </span>

                      <span className="text-red-400">
                        {event.not_going_count || 0} fő nem jön
                      </span>

                    </div>

                    <div className="text-xs text-zinc-500 mb-4">
                      Kezdésig: {getCountdown(event.date)}
                    </div>

                    <div className="text-xs text-zinc-500 mb-4">
                      Végéig: {getUntilEnd(event)}
                    </div>

                    <div className="flex gap-2">

                      <Button
                        size="sm"
                        onClick={() => handleRSVP(event.event_id, "going")}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check size={16} />
                        Ott leszek
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          handleRSVP(event.event_id, "not_going")
                        }
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <X size={16} />
                        Nem jövök
                      </Button>

                    </div>

                    {event.user_id === user?.user_id && !event.highlighted && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleHighlight(event.event_id)
                        }
                        className="w-full mt-3 bg-orange-500 hover:bg-orange-600"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Kiemelés (1000 Ft)
                      </Button>
                    )}

                    {event.highlighted && (
                      <div className="mt-3 text-sm text-orange-400">
                        Ez az esemény jelenleg kiemeltként szerepel.
                      </div>
                    )}

                  </CardContent>
                </Card>
              );
            })}

          </div>
        )}

      </div>
      
      {/* Teljes esemény megtekintése Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl uppercase font-chakra flex items-center gap-3">
                  {selectedEvent.title}
                  {selectedEvent.highlighted && (
                    <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-2 py-1 text-orange-400 text-xs font-semibold">
                      Kiemelt
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              
              {selectedEvent.image_base64 && (
                <img
                  src={selectedEvent.image_base64}
                  alt={selectedEvent.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    {formatDateSafe(selectedEvent.date)}
                  </div>
                  
                  {getEffectiveEndDate(selectedEvent) && (
                    <div className="flex items-center gap-2">
                      <Clock3 size={16} className="text-primary" />
                      Vége: {formatDateSafe(getEffectiveEndDate(selectedEvent))}
                    </div>
                  )}
                  
                  <a 
                    href={getGoogleMapsUrl(selectedEvent.city, selectedEvent.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <MapPin size={16} className="text-primary" />
                    {selectedEvent.address ? `${selectedEvent.city}, ${selectedEvent.address}` : selectedEvent.city}
                    <Navigation size={12} />
                  </a>
                  
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-primary" />
                    {selectedEvent.entry_fee} Ft
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getEventStatusClasses(selectedEvent)}`}>
                    {getEventStatusLabel(selectedEvent)}
                  </div>
                  
                  {selectedEvent.is_official && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-green-400 text-xs font-semibold">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Bejelentett esemény
                    </div>
                  )}
                </div>
                
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-lg font-semibold mb-3 text-white">Leírás</h3>
                  <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {renderDescription(selectedEvent.description)}
                  </div>
                </div>
                
                <div className="border-t border-zinc-800 pt-4">
                  <div className="mb-3">
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${((selectedEvent.going_count || 0) + (selectedEvent.not_going_count || 0)) > 0 
                            ? ((selectedEvent.going_count || 0) / ((selectedEvent.going_count || 0) + (selectedEvent.not_going_count || 0))) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-green-400">{selectedEvent.going_count || 0} fő ott lesz</span>
                    <span className="text-red-400">{selectedEvent.not_going_count || 0} fő nem jön</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 mb-4">
                    <div>Kezdésig: {getCountdown(selectedEvent.date)}</div>
                    <div>Végéig: {getUntilEnd(selectedEvent)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleRSVP(selectedEvent.event_id, "going");
                        setSelectedEvent(null);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check size={16} className="mr-1" />
                      Ott leszek
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => {
                        handleRSVP(selectedEvent.event_id, "not_going");
                        setSelectedEvent(null);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <X size={16} className="mr-1" />
                      Nem jövök
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};