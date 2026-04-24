import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { WORKER_LABEL_MAP } from "@/lib/workerTypes";

Font.registerHyphenationCallback(word => [word]);

type WeatherItem = {
  from: string;
  to: string;
  condition: string;
};

type MaterialItem = {
  name: string;
  qty: string;
};

type EquipmentItem = {
  name: string;
  qty: string;
  status: string;
  note?: string;
};

type Workers = Record<string, number>;

type CustomWorkerType = {
  key: string;
  label: string;
};


type ImageItem = {
  image_url: string;
  caption?: string | null;
};

type Props = {
  projectName: string;
  projectDescription?: string | null;
  projectLocation?: string | null;
  reportDate: string;
  summary: string | null;
  images: ImageItem[];
  weather: WeatherItem[];
  materials: MaterialItem[];
  equipment: EquipmentItem[];
  workers: Workers;
  workerTypes: string[];
  customWorkerTypes: CustomWorkerType[];
  language?: "English" | "Bahasa Melayu";
};
export default function ReportPDF({
  projectName,
  projectDescription,
  projectLocation,
  reportDate,
  summary,
  images,
  weather,
  materials,
  equipment,
  workers,
  workerTypes,
  customWorkerTypes,
  language = "English",
}: Props) {

  const imagePages = chunk(images, 6);

  const pdfText =
  language === "Bahasa Melayu"
    ? {
        reportTitle: "Rekod Laporan Tapak",
        date: "Tarikh",
        project: "PROJEK",
        projectLocation: "Lokasi Projek",
        weather: "Cuaca",
        materials: "Bahan Dihantar",
        equipment: "Jentera / Peralatan",
        workers: "Pekerja",
        summary: "Ringkasan",
        photos: "Gambar",
        noWeather: "Tiada cuaca direkodkan",
        noWorkers: "Tiada pekerja direkodkan",
        noSummary: "Tiada ringkasan diberikan.",
        generatedBy: "Dijana secara automatik oleh Sistem Rekod Site Diary",
      }
    : {
        reportTitle: "Site Diary Record",
        date: "Date",
        project: "PROJECT",
        projectLocation: "Project Location",
        weather: "Weather",
        materials: "Materials Delivered",
        equipment: "Machinery / Equipment",
        workers: "Workers",
        summary: "Summary",
        photos: "Photos",
        noWeather: "No weather recorded",
        noWorkers: "No workers recorded",
        noSummary: "No summary provided.",
        generatedBy: "Generated automatically by Site Diary Record System",
      };

const safeWorkers =
  workers && typeof workers === "object" ? workers : {};

const visibleStandardWorkers = (workerTypes || [])
  .filter((key) => (safeWorkers[key] ?? 0) > 0)
  .map((key) => ({
    label: WORKER_LABEL_MAP[key] || key,
    count: safeWorkers[key] ?? 0,
  }));

const visibleCustomWorkers = (customWorkerTypes || [])
  .filter((item) => item?.key && (safeWorkers[item.key] ?? 0) > 0)
  .map((item) => ({
    label: item.label,
    count: safeWorkers[item.key] ?? 0,
  }));

  const visibleOneOffWorkers = Array.isArray((safeWorkers as any).others)
  ? (safeWorkers as any).others
      .filter((item: any) => item?.label?.trim() && Number(item.count) > 0)
      .map((item: any) => ({
        label: item.label,
        count: Number(item.count),
      }))
  : [];

const visibleWorkers = [
  ...visibleStandardWorkers,
  ...visibleCustomWorkers,
  ...visibleOneOffWorkers,
];

  return (
    <Document>

      {/* ================= PAGE 1 : SUMMARY ================= */}
<Page size="A4" style={styles.page}>

<View style={styles.sectionBlock}>
  {projectDescription && (
<Text style={styles.project}>
  {pdfText.project}: {projectDescription || projectName}
</Text>
)}
</View>

  <Text style={styles.subtitle}>{pdfText.reportTitle}</Text>
<Text style={styles.date}>
  {pdfText.date}: {formatDate(reportDate)}
</Text>

<View style={styles.sectionBlock}>
  {/* WEATHER */}
  <Text style={styles.section}>{pdfText.weather}</Text>
  {weather.length === 0 ? (
    <Text style={styles.muted}>{pdfText.noWeather}</Text>
  ) : (
    weather.map((w, i) => (
      <Text key={i} style={styles.listItem}>
        {w.from} – {w.to} : {w.condition}
      </Text>
    ))
  )}
  </View>

  {/* MATERIALS */}
  <View style={styles.sectionBlock}>
{materials.length > 0 && (
  <>
    <Text style={styles.section}>{pdfText.materials}</Text>
    {materials.map((m, i) => (
      <Text key={i} style={styles.listItem}>
        • {m.name} ({m.qty})
      </Text>
    ))}
  </>
)}
</View>

  {/* EQUIPMENT */}
    <View style={styles.sectionBlock}>
{equipment.length > 0 && (
  <>
    <Text style={styles.section}>{pdfText.equipment}</Text>
    {equipment.map((e, i) => (
      <Text key={i} style={styles.listItem}>
        • {e.name} – {e.qty} – {e.status}
      </Text>
    ))}
  </>
)}
</View>

<View style={styles.sectionBlock}>
  <Text style={styles.section}>{pdfText.workers}</Text>

  {visibleWorkers.length > 0 ? (
    visibleWorkers.map((worker, i) => (
      <Text key={i} style={styles.listItem}>
        • {worker.label}: {worker.count}
      </Text>
    ))
  ) : (
    <Text style={styles.muted}>{pdfText.noWorkers}</Text>
  )}
</View>

      <View style={styles.sectionBlock}>
  {/* SUMMARY */}
  <Text style={styles.section}>{pdfText.summary}</Text>
  <Text style={styles.paragraph}>
    {summary || pdfText.noSummary}
  </Text>
  </View>

  <Text style={styles.footer}>
    Generated automatically by Site Diary Record System
  </Text>
</Page>


      {/* ================= IMAGE PAGES ================= */}
      {imagePages.map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <Text style={styles.section}>Photos</Text>

          <View style={styles.grid} wrap={false}>
            {group.map((img, i) => (
              <View key={i} style={styles.card} wrap={false}>
                <View style={styles.imageBox}>
                  <Image
                    src={img.image_url}
                    style={styles.image}
                  />
                </View>
                {img.caption && (
                  <Text style={styles.caption}>{img.caption}</Text>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Page {pageIndex + 2}
          </Text>
        </Page>
      ))}
    </Document>
  );
}


function formatDate(dateString: string) {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------------- UTIL ---------------- */

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
  },

  project: {
    fontSize: 17,
    fontWeight: "bold",
    wordBreak: "break-word",
  },

  subtitle: {
    fontSize: 13,
    marginBottom: 6,
  },

  date: {
    fontSize: 10,
    marginBottom: 16,
    color: "#555",
  },

  section: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },

  summary: {
    lineHeight: 1.35,
    marginBottom: 12,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    marginBottom: 14,
  },

  imageBox: {
    height: 200,
    border: "1px solid #ddd",
    backgroundColor: "#f4f4f4",
    justifyContent: "center",
    alignItems: "center",
  },

  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },

  caption: {
    fontSize: 9,
    marginTop: 4,
    color: "#444",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 9,
    color: "#777",
  },

  paragraph: {
  marginBottom: 12,
  lineHeight: 1.2,
},

listItem: {
  fontSize: 10,
  marginBottom: 4,
},

muted: {
  fontSize: 10,
  color: "#666",
  marginBottom: 6,
},

subSection: {
  marginTop: 6,
  fontSize: 12,
  fontWeight: "bold",
},

projectDescription: {
  fontSize: 10,
  color: "#555",
  marginBottom: 8,
},

sectionBlock: {
  marginBottom: 14,
},
});
