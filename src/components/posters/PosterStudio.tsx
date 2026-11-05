"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { CalendarDays, Clock3, Download, MapPin, Upload } from "lucide-react";
import { isIndustryPanel } from "@/lib/industry-panels";
import { foldName } from "@/lib/speaker-names";
import "./poster-studio.css";

type Person = { name: string; role: string; organization: string; photo: string };

type Data = {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  moderator: Person;
  speakers: Person[];
  ministryLogo: string;
  copLogo: string;
  footer: string;
  industry: boolean;
};

export type StudioPanel = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  theme: string;
  topic: string;
  summary: string;
  participants: {
    role: string;
    sortOrder: number;
    person: { name: string; role: string; organization: string };
  }[];
};

export type StudioSpeaker = { name: string; photoPath: string };

const DARK_LOGOS = {
  ministryLogo: "/brand/logo-saglik-beyaz.png",
  copLogo: "/brand/logo-cop31-beyaz.png",
};
const LIGHT_LOGOS = {
  ministryLogo: "",
  copLogo: "/brand/cop31-turkiye.png",
};
const DEFAULT_LOGOS = new Set([
  "",
  DARK_LOGOS.ministryLogo,
  DARK_LOGOS.copLogo,
  LIGHT_LOGOS.ministryLogo,
  LIGHT_LOGOS.copLogo,
]);

const sample: Data = {
  title: "Sağlık Sektöründe Yeşil Finans",
  subtitle: "İklim Eylemi, Sürdürülebilir Yatırım ve Yeşil Dönüşüm",
  description:
    "COP31 Antalya kapsamında, sağlık sektöründe iklim dostu finansman modellerini ve sürdürülebilir dönüşüm fırsatlarını ele alıyoruz.",
  date: "13 Kasım 2026",
  time: "16:00 – 17:00",
  venue: "Sağlık Bakanlığı Pavyonu",
  moderator: {
    name: "Prof. Dr. Muhammed Nur Öğün",
    role: "Moderatör",
    organization: "T.C. Sağlık Bakanlığı · Kamu Hastaneleri Genel Müdürlüğü",
    photo: "",
  },
  speakers: [
    { name: "Caner Özsaran", role: "Konuşmacı", organization: "Siemens Healthineers", photo: "" },
    { name: "Erdem Dereli", role: "Konuşmacı", organization: "Gobi Partners", photo: "" },
    { name: "Burak Dilsiz", role: "Konuşmacı", organization: "World Medicine", photo: "" },
  ],
  ministryLogo: LIGHT_LOGOS.ministryLogo,
  copLogo: LIGHT_LOGOS.copLogo,
  footer: "GREEN FINANCE • GREEN FUTURE",
  industry: true,
};

const FIELDS = [
  ["title", "Etkinlik başlığı"],
  ["subtitle", "Alt başlık"],
  ["description", "Açıklama"],
  ["date", "Tarih"],
  ["time", "Saat"],
  ["venue", "Mekân"],
] as const;

const ROLE_RANK: Record<string, number> = { moderator: 0, acilis: 1, sunum: 2, panelist: 3, kapanis: 4 };

function Logo({ src, label }: { src: string; label: string }) {
  return src ? <img className="brand-logo" src={src} alt={label} /> : <div className="logo-placeholder">{label}</div>;
}

function Photo({ person, large = false }: { person: Person; large?: boolean }) {
  return (
    <div className={`portrait ${large ? "large" : ""}`}>
      {person.photo ? <img src={person.photo} alt={person.name} /> : <span>FOTOĞRAF</span>}
    </div>
  );
}

function Meta({ d }: { d: Data }) {
  return (
    <div className="meta">
      <div>
        <CalendarDays />
        <span>
          <small>TARİH</small>
          {d.date}
        </span>
      </div>
      <div>
        <Clock3 />
        <span>
          <small>SAAT</small>
          {d.time}
        </span>
      </div>
      <div>
        <MapPin />
        <span>
          <small>YER</small>
          {d.venue}
        </span>
      </div>
    </div>
  );
}

function Dark({ d }: { d: Data }) {
  return (
    <article className={`poster dark${d.industry ? " is-industry" : ""}`}>
      <header className="brands">
        <Logo src={d.ministryLogo} label="T.C. SAĞLIK BAKANLIĞI" />
        <i />
        <Logo src={d.copLogo} label="COP31 TÜRKİYE · ANTALYA" />
      </header>
      <div className="kicker">COP31 ANTALYA · SAĞLIKTA SÜRDÜRÜLEBİLİR DÖNÜŞÜM</div>
      <h1>{d.title}</h1>
      <h2 className="subtitle">{d.subtitle}</h2>
      <div className="panel">PANEL</div>
      <section className="moderator">
        <Photo person={d.moderator} large />
        <div>
          <b>MODERATÖR</b>
          <h2>{d.moderator.name}</h2>
          <p>{d.moderator.organization}</p>
        </div>
      </section>
      <h3 className="section-title">PANEL KONUŞMACILARI</h3>
      <section className="speakers">
        {d.speakers.map((person, index) => (
          <div className="speaker" key={index}>
            <Photo person={person} />
            <h3>{person.name}</h3>
            <p>{person.organization}</p>
          </div>
        ))}
      </section>
      <Meta d={d} />
      <footer>
        {d.footer} · ANTALYA · COP31
      </footer>
    </article>
  );
}

function Light({ d }: { d: Data }) {
  return (
    <article className={`poster light${d.industry ? " is-industry" : ""}`}>
      <header className="brands">
        <Logo src={d.copLogo} label="COP31 TÜRKİYE · ANTALYA" />
        <i />
        <Logo src={d.ministryLogo} label="T.C. SAĞLIK BAKANLIĞI" />
        <b className="hub">
          COP31 GREEN ZONE
          <br />
          ANTALYA
        </b>
      </header>
      <div className="invite">— YOU ARE INVITED</div>
      <h1>{d.title}</h1>
      <h2 className="subtitle">{d.subtitle}</h2>
      <p className="description">{d.description}</p>
      <Meta d={d} />
      <section className="people">
        <div className="moderator-light">
          <b>MODERATÖR</b>
          <Photo person={d.moderator} large />
          <h3>{d.moderator.name}</h3>
          <p>{d.moderator.organization}</p>
        </div>
        <div className="panelists">
          <h3 className="section-title">PANEL KONUŞMACILARI</h3>
          <div className="speakers">
            {d.speakers.map((person, index) => (
              <div className="speaker" key={index}>
                <Photo person={person} />
                <h3>{person.name}</h3>
                <p>{person.organization}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer>
        {d.footer} · ANTALYA · COP31
      </footer>
    </article>
  );
}

function UploadField({ label, onFile }: { label: string; onFile: (file?: File) => void }) {
  return (
    <label className="upload">
      <Upload size={15} />
      {label}
      <input type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
  );
}

function PersonFields({
  title,
  person,
  onChange,
  onPhoto,
}: {
  title: string;
  person: Person;
  onChange: (key: keyof Person, value: string) => void;
  onPhoto: (file?: File) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <UploadField label="Portre yükle" onFile={onPhoto} />
      {(["name", "role", "organization"] as const).map((key) => (
        <label className="studio-field" key={key}>
          {key === "name" ? "İsim" : key === "role" ? "Rol / unvan" : "Kurum"}
          <input value={person[key]} onChange={(event) => onChange(key, event.target.value)} />
        </label>
      ))}
    </fieldset>
  );
}

function trDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (!iso || Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function placeLabel(location: string) {
  const text = location.trim();
  if (!text || text.toLocaleLowerCase("tr").includes("ana sahne")) return "Sağlık Bakanlığı Pavyonu";
  return text;
}

function personName(row: StudioPanel["participants"][number]) {
  const title = row.person.role.trim();
  const name = row.person.name.trim();
  if (!title || /moderat|konuşmacı|konusmaci|panelist/i.test(title)) return name;
  const folded = title.replace(/\./g, "").toLocaleLowerCase("tr");
  if (name.toLocaleLowerCase("tr").includes(folded)) return name;
  return `${title} ${name}`;
}

function blankSpeaker(): Person {
  return { name: "", role: "Konuşmacı", organization: "", photo: "" };
}

function fromPanel(panel: StudioPanel, photos: Map<string, string>, logos: Pick<Data, "ministryLogo" | "copLogo">): Data {
  const rows = [...panel.participants].sort(
    (a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) || a.sortOrder - b.sortOrder
  );
  const moderator = rows.find((row) => row.role === "moderator") || rows[0];
  const rest = rows.filter((row) => row !== moderator).slice(0, 3);
  const speakers = [...rest.map((row) => toPerson(row, photos, "Konuşmacı")), ...Array.from({ length: 3 }, blankSpeaker)].slice(0, 3);
  const title = panel.title.trim();
  return {
    title,
    subtitle: panel.theme.trim() || panel.topic.trim(),
    description: panel.summary.trim() || `COP31 Antalya kapsamında düzenlenen “${title}” oturumuna davetlisiniz.`,
    date: trDate(panel.date),
    time: panel.startTime && panel.endTime ? `${panel.startTime} – ${panel.endTime}` : panel.startTime,
    venue: placeLabel(panel.location || ""),
    moderator: moderator
      ? toPerson(moderator, photos, "Moderatör")
      : { name: "", role: "Moderatör", organization: "", photo: "" },
    speakers,
    ministryLogo: logos.ministryLogo,
    copLogo: logos.copLogo,
    footer: "SAĞLIK PAVYONU",
    industry: isIndustryPanel({ date: panel.date, startTime: panel.startTime, title: panel.title }),
  };
}

function toPerson(row: StudioPanel["participants"][number], photos: Map<string, string>, role: string): Person {
  return {
    name: personName(row),
    role,
    organization: row.person.organization,
    photo: photos.get(foldName(row.person.name)) || "",
  };
}

export function PosterStudio({ panels, speakers }: { panels: StudioPanel[]; speakers: StudioSpeaker[] }) {
  const [data, setData] = useState<Data>(sample);
  const [kind, setKind] = useState<"dark" | "light">("light");
  const [panelId, setPanelId] = useState("");
  const [exportError, setExportError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const photos = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of speakers) {
      if (row.photoPath) map.set(foldName(row.name), row.photoPath);
    }
    return map;
  }, [speakers]);

  function update(path: string, value: string) {
    setData((old) => {
      const next = structuredClone(old) as Data & Record<string, unknown>;
      const parts = path.split(".");
      let cursor: Record<string, unknown> = next;
      for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]] as Record<string, unknown>;
      cursor[parts[parts.length - 1]] = value;
      return next;
    });
  }

  function file(path: string, uploaded?: File) {
    if (uploaded) update(path, URL.createObjectURL(uploaded));
  }

  function chooseKind(next: "dark" | "light") {
    const logos = next === "dark" ? DARK_LOGOS : LIGHT_LOGOS;
    setData((old) => ({
      ...old,
      ministryLogo: DEFAULT_LOGOS.has(old.ministryLogo) ? logos.ministryLogo : old.ministryLogo,
      copLogo: DEFAULT_LOGOS.has(old.copLogo) ? logos.copLogo : old.copLogo,
    }));
    setKind(next);
  }

  function choosePanel(id: string) {
    setPanelId(id);
    if (!id) {
      setData((old) => ({ ...sample, ministryLogo: old.ministryLogo, copLogo: old.copLogo }));
      return;
    }
    const panel = panels.find((item) => item.id === id);
    if (!panel) return;
    setData((old) => fromPanel(panel, photos, old));
  }

  async function exportPng() {
    if (!ref.current) return;
    setExportError("");
    try {
      const url = await toPng(ref.current, { pixelRatio: 3, cacheBust: false });
      const link = document.createElement("a");
      link.href = url;
      link.download = `cop31-${kind}-poster.png`;
      link.click();
    } catch {
      setExportError("PNG oluşturulamadı. Sayfayı yenileyip yeniden deneyin.");
    }
  }

  const ordered = [...panels].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div className="poster-studio">
      <main className="studio">
        <aside className="editor">
          <div className="editor-top">
            <div>
              <small>COP31 · POSTER STUDIO</small>
              <h1>Afiş oluşturucu</h1>
            </div>
            <button type="button" onClick={() => void exportPng()}>
              <Download size={15} /> PNG indir
            </button>
          </div>
          <nav>
            <button type="button" className={kind === "dark" ? "selected" : ""} onClick={() => chooseKind("dark")}>
              01 Koyu COP31
            </button>
            <button type="button" className={kind === "light" ? "selected" : ""} onClick={() => chooseKind("light")}>
              02 Açık davetiye
            </button>
          </nav>
          <label className="studio-field">
            Panelden doldur
            <select value={panelId} onChange={(event) => choosePanel(event.target.value)}>
              <option value="">Örnek metin</option>
              {ordered.map((panel) => (
                <option key={panel.id} value={panel.id}>
                  {trDate(panel.date)} · {panel.startTime} · {panel.title}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">Şablon bir moderatör ve üç konuşmacı gösterir. Panelde daha fazla kişi varsa ilk üçü gelir; metin, logo ve fotoğrafı buradan değiştirebilirsiniz.</p>
          {data.industry ? <p className="hint">Bu oturum endüstri paneli. Başlık kalın yazılır.</p> : null}
          {exportError ? <p className="hint">{exportError}</p> : null}
          <fieldset>
            <legend>Etkinlik bilgileri</legend>
            {FIELDS.map(([key, label]) => (
              <label className="studio-field" key={key}>
                {label}
                {key === "description" ? (
                  <textarea value={data[key]} onChange={(event) => update(key, event.target.value)} />
                ) : (
                  <input value={data[key]} onChange={(event) => update(key, event.target.value)} />
                )}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Kurumsal logolar</legend>
            <UploadField label="Sağlık Bakanlığı logosu" onFile={(uploaded) => file("ministryLogo", uploaded)} />
            <UploadField label="COP31 logosu" onFile={(uploaded) => file("copLogo", uploaded)} />
          </fieldset>
          <PersonFields
            title="Moderatör"
            person={data.moderator}
            onChange={(key, value) => update(`moderator.${key}`, value)}
            onPhoto={(uploaded) => file("moderator.photo", uploaded)}
          />
          {data.speakers.map((person, index) => (
            <PersonFields
              key={index}
              title={`Konuşmacı ${index + 1}`}
              person={person}
              onChange={(key, value) => update(`speakers.${index}.${key}`, value)}
              onPhoto={(uploaded) => file(`speakers.${index}.photo`, uploaded)}
            />
          ))}
          <label className="studio-field">
            Alt bant metni
            <input value={data.footer} onChange={(event) => update("footer", event.target.value)} />
          </label>
        </aside>
        <section className="preview">
          <div className="preview-heading">
            <div>
              <small>CANLI ÖNİZLEME</small>
              <h2>{kind === "dark" ? "Koyu COP31" : "Açık davetiye"}</h2>
            </div>
            <span>4:5 · Dikey</span>
          </div>
          <div ref={ref} className="render">
            {kind === "dark" ? <Dark d={data} /> : <Light d={data} />}
          </div>
        </section>
      </main>
    </div>
  );
}
