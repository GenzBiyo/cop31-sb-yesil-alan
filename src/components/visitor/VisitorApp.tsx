"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type AgendaItem = {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  status: string;
};

type Day = { id: string; date: string; theme: string; agenda: AgendaItem[] };

type EventItem = {
  id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
};

type Note = { id: string; title: string; body: string; kind: string; read: boolean; createdAt: string };
type Join = { kind: string; refId: string; title: string };
type Question = {
  id: string;
  agendaId: string;
  sessionTitle: string;
  author: string;
  authorRole: string;
  organization: string;
  body: string;
  status: string;
  answer: string;
  createdAt: string;
  mine: boolean;
  canAnswer: boolean;
};

type Directory = {
  companies: { id: string; name: string }[];
  speakers: { id: string; name: string; organization: string }[];
};

type Meeting = {
  id: string;
  kind: string;
  withName: string;
  topic: string;
  message: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  whenDate: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  fromName: string;
  fromOrganization: string;
  outgoing: boolean;
  canRespond: boolean;
  canEdit: boolean;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  companyId: string;
  personId: string;
};

type AppState = {
  device: {
    name: string;
    email: string;
    phone: string;
    organization: string;
    role: string;
    companyId: string;
    personId: string;
    push: boolean;
  };
  directory: Directory;
  vapidPublicKey: string;
  days: Day[];
  events: EventItem[];
  notes: Note[];
  unread: number;
  joins: Join[];
  questions: Question[];
  meetings: Meeting[];
};

type Flash = { title: string; message: string; location: string; already: boolean };
type Tab = "gundem" | "okut" | "katil" | "soru" | "gorus" | "mesaj";

const TOKEN_KEY = "cop31-device";
const PROFILE_KEY = "cop31-profile";

function cookieToken() {
  const match = document.cookie.match(/(?:^|;\s*)cop31_device=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function keepToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `cop31_device=${encodeURIComponent(token)}; Path=/; Max-Age=34560000; SameSite=Lax${secure}`;
}

function deviceToken() {
  const existing = localStorage.getItem(TOKEN_KEY) || cookieToken();
  if (existing) {
    keepToken(existing);
    return existing;
  }
  const next = crypto.randomUUID();
  keepToken(next);
  return next;
}

function savedProfile(): ProfileForm | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileForm;
    if (!parsed?.name || parsed.name.trim().length < 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function call<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-cop31-device": token,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "İstek başarısız");
  return data as T;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function VisitorApp({ initialCode = "" }: { initialCode?: string }) {
  const { tx, tag } = useI18n();
  const [token, setToken] = useState("");
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>(initialCode ? "okut" : "gundem");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [dayId, setDayId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [question, setQuestion] = useState("");
  const [manual, setManual] = useState(initialCode);
  const [profile, setProfile] = useState<ProfileForm>({ name: "", email: "", phone: "", organization: "", role: "ziyaretci", companyId: "", personId: "" });
  const [meet, setMeet] = useState({ kind: "ikili", target: "bakanlik", topic: "", message: "", preferredDate: "", preferredTime: "" });
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [phone, setPhone] = useState(false);
  const [useBrowser, setUseBrowser] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraNote, setCameraNote] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopCamera = useRef<(() => void) | null>(null);
  const scanned = useRef("");
  const restoreOnce = useRef(false);
  const [heldName, setHeldName] = useState(false);

  const load = useCallback(async (current: string) => {
    const next = await call<AppState>(current, "/api/app");
    setState(next);
    setError("");
    return next;
  }, []);

  useEffect(() => {
    const current = deviceToken();
    setToken(current);
    void load(current).catch((err: Error) => setError(err.message));
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(standaloneMode);
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIos(apple);
    setPhone(apple || /Android/i.test(navigator.userAgent));
    setUseBrowser(standaloneMode || localStorage.getItem("cop31-use-browser") === "1");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [load]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => {
      void load(token).catch(() => undefined);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [token, load]);

  useEffect(() => {
    if (tab !== "mesaj" || !token || !state?.unread) return;
    void call<AppState>(token, "/api/app/notes", { method: "PATCH", body: JSON.stringify({ all: true }) })
      .then(setState)
      .catch(() => undefined);
  }, [tab, token, state?.unread]);

  useEffect(() => {
    if (savedProfile()) setHeldName(true);
  }, []);

  useEffect(() => {
    if (!token || !state || state.device.name || restoreOnce.current) return;
    const saved = savedProfile();
    if (!saved) return;
    restoreOnce.current = true;
    void call<AppState>(token, "/api/app", { method: "POST", body: JSON.stringify(saved) })
      .then(setState)
      .catch(() => setHeldName(false));
  }, [token, state]);

  useEffect(() => {
    if (!state) return;
    setProfile({
      name: state.device.name,
      email: state.device.email,
      phone: state.device.phone,
      organization: state.device.organization,
      role: state.device.role || "ziyaretci",
      companyId: state.device.companyId || "",
      personId: state.device.personId || "",
    });
    if (!dayId && state.days[0]) setDayId(state.days[0].id);
  }, [state, dayId]);

  const sessions = useMemo(
    () =>
      (state?.days || []).flatMap((day) =>
        day.agenda.map((item) => ({ ...item, date: day.date, theme: day.theme }))
      ),
    [state]
  );

  useEffect(() => {
    if (sessionId || !sessions.length) return;
    const preferred = sessions.find((item) => item.type === "Sunum" || item.type === "Panel") || sessions[0];
    setSessionId(preferred.id);
  }, [sessionId, sessions]);

  const scan = useCallback(
    async (raw: string) => {
      if (!token || !raw.trim()) return;
      setBusy(true);
      setError("");
      try {
        const result = await call<Flash & { state: AppState }>(token, "/api/app/scan", {
          method: "POST",
          body: JSON.stringify({ code: raw }),
        });
        setState(result.state);
        setFlash({ title: result.title, message: result.message, location: result.location, already: result.already });
        setTab("okut");
        navigator.vibrate?.(40);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Etiket okunamadı");
      } finally {
        setBusy(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token || !initialCode || scanned.current === initialCode) return;
    scanned.current = initialCode;
    void scan(initialCode);
  }, [token, initialCode, scan]);

  useEffect(() => {
    return () => stopCamera.current?.();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const next = await call<AppState>(token, "/api/app", { method: "POST", body: JSON.stringify(profile) });
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function join(kind: "agenda" | "event", refId: string, on: boolean) {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const result = await call<{ state: AppState }>(token, "/api/app/join", {
        method: "POST",
        body: JSON.stringify({ kind, refId, on }),
      });
      setState(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Katılım kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function sendQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      setState(
        await call<AppState>(token, "/api/app/question", {
          method: "POST",
          body: JSON.stringify({ agendaId: sessionId, body: question }),
        })
      );
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Soru iletilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    if (!token || !state?.vapidPublicKey) return;
    setError("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(tx("Bildirim izni verilmedi"));
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(state.vapidPublicKey),
      });
      setState(
        await call<AppState>(token, "/api/app/push", {
          method: "POST",
          body: JSON.stringify({ subscription }),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tx("Bildirim açılamadı"));
    }
  }

  async function openCamera() {
    setCameraNote("");
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraNote(tx("Bu tarayıcı kameradan okuyamıyor. Telefonun kendi kamerasıyla karekodu okutun ya da kodu yazın."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ["qr_code"] });
      let stopped = false;
      stopCamera.current = () => {
        stopped = true;
        stream.getTracks().forEach((track) => track.stop());
        if (video.srcObject) video.srcObject = null;
        setCameraOn(false);
      };
      setCameraOn(true);
      const tick = async () => {
        if (stopped) return;
        try {
          const found = await detector.detect(video);
          const raw = found[0]?.rawValue;
          if (raw) {
            stopCamera.current?.();
            void scan(raw);
            return;
          }
        } catch {
          /* kare henüz hazır değil */
        }
        if (!stopped) window.setTimeout(() => void tick(), 280);
      };
      void tick();
    } catch {
      setCameraNote(tx("Kameraya izin verilmedi. Kodu yazabilir veya telefon kamerasıyla karekodu okutabilirsiniz."));
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
    localStorage.setItem("cop31-use-browser", "1");
    setUseBrowser(true);
  }

  function continueInBrowser() {
    localStorage.setItem("cop31-use-browser", "1");
    setUseBrowser(true);
  }

  const joined = new Set((state?.joins || []).map((item) => `${item.kind}:${item.refId}`));
  const day = state?.days.find((item) => item.id === dayId) || state?.days[0];
  const sessionQuestions = (state?.questions || []).filter((item) => !sessionId || item.agendaId === sessionId || item.mine || item.canAnswer);

  async function sendMeeting() {
    if (!token) return;
    const [withKind, withId = ""] = meet.target.split(":");
    setBusy(true);
    setError("");
    try {
      setState(
        await call<AppState>(token, "/api/app/meeting", {
          method: "POST",
          body: JSON.stringify({
            kind: meet.kind,
            withKind,
            withId,
            topic: meet.topic,
            message: meet.message,
            preferredDate: meet.preferredDate,
            preferredTime: meet.preferredTime,
          }),
        })
      );
      setMeet({ kind: meet.kind, target: "bakanlik", topic: "", message: "", preferredDate: "", preferredTime: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep iletilemedi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="phone-app">
      <header className="phone-top">
        <div>
          <p>{tx("T.C. Sağlık Bakanlığı")}</p>
          <h1>COP31</h1>
        </div>
        <span>{tx("Antalya · 9–20 Kasım 2026")}</span>
      </header>

      {phone && !standalone && useBrowser ? (
        <button className="phone-install-link" type="button" onClick={() => setUseBrowser(false)}>
          {tx("Ana ekrana ekle")}
        </button>
      ) : null}

      <div className="phone-scroll">
        {error ? <p className="phone-error">{tx(error) === error ? error : tx(error)}</p> : null}

        {state && !state.device.name && !heldName ? (
          <form className="phone-card" onSubmit={saveProfile}>
            <h2>{tx("Sizi tanıyalım")}</h2>
            <p>{tx("Ziyaretçi, firma veya konuşmacı olarak girin. Sorular ve görüşme talepleri bu adla gider.")}</p>
            <RoleFields profile={profile} setProfile={setProfile} directory={state.directory} tx={tx} />
            <input className="phone-field" placeholder={tx("Ad soyad")} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            <input className="phone-field" placeholder={tx("Kurum")} value={profile.organization} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
            <input className="phone-field" placeholder={tx("E-posta")} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} inputMode="email" />
            <input className="phone-field" placeholder={tx("Telefon")} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} inputMode="tel" />
            <button className="phone-btn" disabled={busy} type="submit">{tx("Kaydet ve devam et")}</button>
          </form>
        ) : null}

        {tab === "gundem" ? (
          <section>
            <h2>{tx("COP31 Sağlık Bakanlığı gündemi")}</h2>
            <div className="phone-days">
              {(state?.days || []).map((item) => (
                <button key={item.id} type="button" className={item.id === day?.id ? "is-on" : ""} onClick={() => setDayId(item.id)}>
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString(tag, { day: "numeric", month: "short" })}
                </button>
              ))}
            </div>
            {day ? <p className="phone-kicker">{day.theme}</p> : null}
            {(day?.agenda || []).map((item) => {
              const on = joined.has(`agenda:${item.id}`);
              return (
                <article key={item.id} className="phone-card">
                  <div className="phone-row">
                    <span className={`phone-type is-${item.type}`}>{tx(item.type)}</span>
                    <span>{item.startTime}–{item.endTime}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.location}</p>
                  <button className={`phone-btn ${on ? "is-quiet" : ""}`} type="button" disabled={busy} onClick={() => void join("agenda", item.id, !on)}>
                    {on ? tx("Katıldınız") : tx("Katılacağım")}
                  </button>
                </article>
              );
            })}
            {!day?.agenda.length ? <p className="phone-muted">{tx("Bu gün için oturum yok.")}</p> : null}
          </section>
        ) : null}

        {tab === "okut" ? (
          <section>
            <h2>{tx("Etiket okut")}</h2>
            <p className="phone-muted">{tx("Stanttaki, kapıdaki veya koltuktaki karekodu okutun. Mesaj telefonunuza düşer.")}</p>
            <video ref={videoRef} className={`phone-camera ${cameraOn ? "is-on" : ""}`} playsInline muted />
            {cameraOn ? (
              <button className="phone-btn is-quiet" type="button" onClick={() => stopCamera.current?.()}>{tx("Kamerayı kapat")}</button>
            ) : (
              <button className="phone-btn" type="button" onClick={() => void openCamera()}>{tx("Kamerayı aç")}</button>
            )}
            {cameraNote ? <p className="phone-muted">{cameraNote}</p> : null}
            <form
              className="phone-card"
              onSubmit={(event) => {
                event.preventDefault();
                void scan(manual);
              }}
            >
              <input className="phone-field" placeholder={tx("Etiket kodu")} value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} />
              <button className="phone-btn" disabled={busy || !manual.trim()} type="submit">{tx("Kodu gönder")}</button>
            </form>
          </section>
        ) : null}

        {tab === "katil" ? (
          <section>
            <h2>{tx("Etkinliklere katıl")}</h2>
            {(state?.joins || []).length ? (
              <div className="phone-card">
                <h3>{tx("Katıldıklarınız")}</h3>
                <ul>
                  {state?.joins.map((item) => (
                    <li key={`${item.kind}:${item.refId}`}>{item.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {(state?.events || []).map((item) => {
              const on = joined.has(`event:${item.id}`);
              return (
                <article key={item.id} className="phone-card">
                  <div className="phone-row">
                    <span>{item.date} · {item.startTime}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.location}</p>
                  {item.description ? <p className="phone-muted">{item.description}</p> : null}
                  <button className={`phone-btn ${on ? "is-quiet" : ""}`} type="button" disabled={busy} onClick={() => void join("event", item.id, !on)}>
                    {on ? tx("Katıldınız") : tx("Katılacağım")}
                  </button>
                </article>
              );
            })}
            {!state?.events.length ? <p className="phone-muted">{tx("Açık etkinlik yok.")}</p> : null}
          </section>
        ) : null}

        {tab === "soru" ? (
          <section>
            <h2>{tx("Sunumda soru sor")}</h2>
            <p className="phone-muted">{tx("Konuşmacı ve firma, kendi oturumuna gelen soruyu burada yanıtlar.")}</p>
            <form className="phone-card" onSubmit={sendQuestion}>
              <label>
                {tx("Oturum")}
                <select className="phone-field" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                  {sessions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.date.slice(5)} {item.startTime} · {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <textarea className="phone-field" rows={4} placeholder={tx("Sorunuzu yazın")} value={question} onChange={(e) => setQuestion(e.target.value)} />
              <button className="phone-btn" disabled={busy || question.trim().length < 4} type="submit">{tx("Soruyu gönder")}</button>
            </form>
            {sessionQuestions.map((item) => (
              <TalkQuestion key={item.id} item={item} token={token} tx={tx} busy={busy} onSaved={setState} onError={setError} />
            ))}
          </section>
        ) : null}

        {tab === "gorus" ? (
          <section>
            <h2>{tx("İkili görüşme ve toplantı")}</h2>
            <p className="phone-muted">{tx("Talep bakanlığa, bir firmaya veya konuşmacıya gider. Kabul edilince saat ve yer düzenlenir.")}</p>
            <form
              className="phone-card"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMeeting();
              }}
            >
              <select className="phone-field" value={meet.kind} onChange={(e) => setMeet({ ...meet, kind: e.target.value })}>
                <option value="ikili">{tx("İkili görüşme")}</option>
                <option value="toplanti">{tx("Toplantı")}</option>
              </select>
              <select className="phone-field" value={meet.target} onChange={(e) => setMeet({ ...meet, target: e.target.value })}>
                <option value="bakanlik">{tx("T.C. Sağlık Bakanlığı")}</option>
                {(state?.directory.companies || []).map((company) => (
                  <option key={company.id} value={`firma:${company.id}`}>{company.name}</option>
                ))}
                {(state?.directory.speakers || []).map((person) => (
                  <option key={person.id} value={`konusmaci:${person.id}`}>{person.name}{person.organization ? ` · ${person.organization}` : ""}</option>
                ))}
              </select>
              <input className="phone-field" placeholder={tx("Konu")} value={meet.topic} onChange={(e) => setMeet({ ...meet, topic: e.target.value })} />
              <textarea className="phone-field" rows={3} placeholder={tx("Kısa not")} value={meet.message} onChange={(e) => setMeet({ ...meet, message: e.target.value })} />
              <input className="phone-field" type="date" value={meet.preferredDate} onChange={(e) => setMeet({ ...meet, preferredDate: e.target.value })} />
              <input className="phone-field" type="time" value={meet.preferredTime} onChange={(e) => setMeet({ ...meet, preferredTime: e.target.value })} />
              <button className="phone-btn" disabled={busy || meet.topic.trim().length < 3} type="submit">{tx("Talep gönder")}</button>
            </form>
            {(state?.meetings || []).map((item) => (
              <MeetingCard key={`${item.id}:${item.status}:${item.whenDate}:${item.startTime}`} item={item} token={token} tx={tx} onSaved={setState} onError={setError} />
            ))}
            {!state?.meetings.length ? <p className="phone-muted">{tx("Henüz görüşme talebi yok.")}</p> : null}
          </section>
        ) : null}

        {tab === "mesaj" ? (
          <section>
            <h2>{tx("Mesajlar")}</h2>
            <div className="phone-card">
              <p>{state?.device.push ? tx("Bildirimler açık. Salon anonsu telefonunuza düşer.") : tx("Bildirimleri açın; uygulama kapalıyken de mesaj gelsin.")}</p>
              {state?.device.push ? null : (
                <button className="phone-btn" type="button" onClick={() => void enablePush()}>{tx("Bildirimleri aç")}</button>
              )}
              {profile.name ? (
                <form onSubmit={saveProfile}>
                  <RoleFields profile={profile} setProfile={setProfile} directory={state?.directory} tx={tx} />
                  <input className="phone-field" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  <input className="phone-field" placeholder={tx("Kurum")} value={profile.organization} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
                  <input className="phone-field" placeholder={tx("E-posta")} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  <input className="phone-field" placeholder={tx("Telefon")} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  <button className="phone-btn is-quiet" disabled={busy} type="submit">{tx("Bilgilerimi güncelle")}</button>
                </form>
              ) : null}
            </div>
            {(state?.notes || []).map((item) => (
              <article key={item.id} className={`phone-card ${item.read ? "" : "is-new"}`}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <p className="phone-muted">{new Date(item.createdAt).toLocaleString(tag)}</p>
              </article>
            ))}
            {!state?.notes.length ? <p className="phone-muted">{tx("Henüz mesaj yok. Bir etiketi okutun.")}</p> : null}
          </section>
        ) : null}
      </div>

      <nav className="phone-nav">
        {(
          [
            ["gundem", "Gündem"],
            ["okut", "Okut"],
            ["katil", "Katıl"],
            ["soru", "Soru"],
            ["gorus", "Görüş"],
            ["mesaj", "Mesaj"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>
            {tx(label)}
            {id === "mesaj" && state?.unread ? <i>{state.unread}</i> : null}
            {id === "gorus" && (state?.meetings || []).some((item) => item.canRespond) ? <i>{state?.meetings.filter((item) => item.canRespond).length}</i> : null}
          </button>
        ))}
      </nav>

      {phone && !standalone && !useBrowser && !initialCode && !flash ? (
        <div className="phone-setup" role="dialog">
          <img src="/icons/icon-192.png" alt="" width={72} height={72} />
          <p>{tx("T.C. Sağlık Bakanlığı")}</p>
          <h2>COP31</h2>
          <p>{tx("Ana ekrana ekleyin. Simge uygulama gibi durur, bildirimler o zaman gelir.")}</p>
          {installEvent ? (
            <button className="phone-btn" type="button" onClick={() => void install()}>{tx("Telefona ekle")}</button>
          ) : ios ? (
            <ol>
              <li>{tx("Alttaki Paylaş karesine basın.")}</li>
              <li>{tx("Ana Ekrana Ekle’yi seçin.")}</li>
              <li>{tx("Ekle’ye basın, sonra simgeden açın.")}</li>
            </ol>
          ) : (
            <ol>
              <li>{tx("Tarayıcı menüsünü açın.")}</li>
              <li>{tx("Ana ekrana ekle veya Uygulamayı yükle’yi seçin.")}</li>
              <li>{tx("Simgeden açınca bildirim izni sorun.")}</li>
            </ol>
          )}
          <button className="phone-btn is-quiet" type="button" onClick={continueInBrowser}>{tx("Şimdi tarayıcıda kullan")}</button>
        </div>
      ) : null}

      {flash ? (
        <div className="phone-flash" role="dialog">
          <div>
            <p>{tx("Mesajınız geldi")}</p>
            <h2>{flash.title}</h2>
            <p>{flash.message}</p>
            {flash.location ? <p className="phone-muted">{flash.location}</p> : null}
            {flash.already ? <p className="phone-muted">{tx("Bu etiketi daha önce okuttunuz.")}</p> : null}
            <button className="phone-btn" type="button" onClick={() => { setFlash(null); setTab("mesaj"); }}>
              {tx("Mesaj kutusuna geç")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function roleWord(role: string, tx: (text: string) => string) {
  if (role === "firma") return tx("Firma");
  if (role === "konusmaci") return tx("Konuşmacı");
  return tx("Ziyaretçi");
}

function RoleFields({
  profile,
  setProfile,
  directory,
  tx,
}: {
  profile: ProfileForm;
  setProfile: (next: ProfileForm) => void;
  directory?: Directory;
  tx: (text: string) => string;
}) {
  return (
    <>
      <select
        className="phone-field"
        value={profile.role}
        onChange={(e) => setProfile({ ...profile, role: e.target.value, companyId: "", personId: "" })}
      >
        <option value="ziyaretci">{tx("Ziyaretçi")}</option>
        <option value="firma">{tx("Firma")}</option>
        <option value="konusmaci">{tx("Konuşmacı")}</option>
      </select>
      {profile.role === "firma" ? (
        <select
          className="phone-field"
          value={profile.companyId}
          onChange={(e) => {
            const company = directory?.companies.find((item) => item.id === e.target.value);
            setProfile({ ...profile, companyId: e.target.value, organization: company?.name || profile.organization });
          }}
        >
          <option value="">{tx("Firmanızı seçin")}</option>
          {(directory?.companies || []).map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      ) : null}
      {profile.role === "konusmaci" ? (
        <select
          className="phone-field"
          value={profile.personId}
          onChange={(e) => {
            const person = directory?.speakers.find((item) => item.id === e.target.value);
            setProfile({
              ...profile,
              personId: e.target.value,
              name: profile.name || person?.name || "",
              organization: person?.organization || profile.organization,
            });
          }}
        >
          <option value="">{tx("Konuşmacı kaydınız")}</option>
          {(directory?.speakers || []).map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}{person.organization ? ` · ${person.organization}` : ""}
            </option>
          ))}
        </select>
      ) : null}
    </>
  );
}

function TalkQuestion({
  item,
  token,
  tx,
  busy,
  onSaved,
  onError,
}: {
  item: Question;
  token: string;
  tx: (text: string) => string;
  busy: boolean;
  onSaved: (next: AppState) => void;
  onError: (message: string) => void;
}) {
  const [answer, setAnswer] = useState(item.answer);
  return (
    <article className="phone-card">
      <div className="phone-row">
        <strong>{item.mine ? tx("Siz") : item.author}</strong>
        <span className={`phone-type is-${item.status}`}>{tx(item.status)}</span>
      </div>
      <p className="phone-muted">{roleWord(item.authorRole, tx)}{item.organization ? ` · ${item.organization}` : ""}</p>
      <p>{item.body}</p>
      <p className="phone-muted">{item.sessionTitle}</p>
      {item.answer ? <p className="phone-answer">{tx("Yanıt")}: {item.answer}</p> : null}
      {item.canAnswer ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              onSaved(await call<AppState>(token, "/api/app/question", { method: "PATCH", body: JSON.stringify({ id: item.id, answer }) }));
            } catch (err) {
              onError(err instanceof Error ? err.message : "Yanıt kaydedilemedi");
            }
          }}
        >
          <textarea className="phone-field" rows={3} placeholder={tx("Yanıtınız")} value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button className="phone-btn" disabled={busy || answer.trim().length < 2} type="submit">{tx("Yanıtı gönder")}</button>
        </form>
      ) : null}
    </article>
  );
}

function MeetingCard({
  item,
  token,
  tx,
  onSaved,
  onError,
}: {
  item: Meeting;
  token: string;
  tx: (text: string) => string;
  onSaved: (next: AppState) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    whenDate: item.whenDate,
    startTime: item.startTime,
    endTime: item.endTime,
    location: item.location,
    note: item.note,
  });

  async function patch(body: Record<string, string>) {
    try {
      onSaved(await call<AppState>(token, "/api/app/meeting", { method: "PATCH", body: JSON.stringify({ id: item.id, ...body }) }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Görüşme güncellenemedi");
    }
  }

  return (
    <article className="phone-card">
      <div className="phone-row">
        <span className="phone-type">{item.kind === "ikili" ? tx("İkili görüşme") : tx("Toplantı")}</span>
        <span className={`phone-type is-${item.status}`}>{tx(item.status)}</span>
      </div>
      <h3>{item.topic}</h3>
      <p>{item.outgoing ? item.withName : `${item.fromName}${item.fromOrganization ? ` · ${item.fromOrganization}` : ""}`}</p>
      {item.message ? <p className="phone-muted">{item.message}</p> : null}
      {item.status === "Bekliyor" ? (
        <p className="phone-muted">{[item.preferredDate, item.preferredTime].filter(Boolean).join(" · ") || tx("Saat belirtilmedi")}</p>
      ) : null}
      {item.canRespond ? (
        <div className="phone-row" style={{ marginTop: 8 }}>
          <button className="phone-btn" style={{ width: "auto", flex: 1 }} type="button" onClick={() => void patch({ status: "Kabul" })}>{tx("Kabul et")}</button>
          <button className="phone-btn is-quiet" style={{ width: "auto", flex: 1 }} type="button" onClick={() => void patch({ status: "Red" })}>{tx("Reddet")}</button>
        </div>
      ) : null}
      {item.canEdit ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void patch(form);
          }}
        >
          <input className="phone-field" type="date" value={form.whenDate} onChange={(e) => setForm({ ...form, whenDate: e.target.value })} />
          <input className="phone-field" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className="phone-field" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <input className="phone-field" placeholder={tx("Yer")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <textarea className="phone-field" rows={2} placeholder={tx("Not")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button className="phone-btn" type="submit">{tx("Görüşmeyi güncelle")}</button>
        </form>
      ) : null}
      {item.status === "Kabul" && !item.canEdit ? (
        <p className="phone-muted">{[item.whenDate, item.startTime, item.location].filter(Boolean).join(" · ")}</p>
      ) : null}
    </article>
  );
}

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};
