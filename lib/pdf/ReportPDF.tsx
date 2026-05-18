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

      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>

        {/* HEADER BLOCK */}
        <View style={styles.header}>
          <View style={styles.headerGoldLine} />
          <View style={styles.headerInner}>
            <View style={styles.headerLeft}>
              {projectDescription && (
                <Text style={styles.headerEyebrow}>{pdfText.project}</Text>
              )}
              <Text style={styles.headerTitle}>
                {projectDescription || projectName}
              </Text>
              {projectLocation && (
                <Text style={styles.headerLocation}>{projectLocation}</Text>
              )}
              <Text style={styles.headerReportLabel}>{pdfText.reportTitle}</Text>
            </View>
            <View style={styles.headerDateBox}>
              <Text style={styles.headerDateLabel}>{pdfText.date}</Text>
              <Text style={styles.headerDateValue}>{formatDate(reportDate)}</Text>
            </View>
          </View>
        </View>

        {/* WEATHER */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>{pdfText.weather}</Text>
          </View>
          {weather.length === 0 ? (
            <Text style={styles.muted}>{pdfText.noWeather}</Text>
          ) : (
            weather.map((w, i) => (
              <Text key={i} style={styles.listItem}>
                {w.from} – {w.to}{"  |  "}{w.condition}
              </Text>
            ))
          )}
        </View>

        {/* MATERIALS */}
        {materials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>{pdfText.materials}</Text>
            </View>
            {materials.map((m, i) => (
              <Text key={i} style={styles.listItem}>
                {m.name}{"  —  "}{m.qty}
              </Text>
            ))}
          </View>
        )}

        {/* EQUIPMENT */}
        {equipment.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>{pdfText.equipment}</Text>
            </View>
            {equipment.map((e, i) => (
              <Text key={i} style={styles.listItem}>
                {e.name}{"  —  "}{e.qty}{"  —  "}{e.status}
              </Text>
            ))}
          </View>
        )}

        {/* WORKERS */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>{pdfText.workers}</Text>
          </View>
          {visibleWorkers.length > 0 ? (
            visibleWorkers.map((worker, i) => (
              <Text key={i} style={styles.listItem}>
                {worker.label}{"  —  "}{worker.count}
              </Text>
            ))
          ) : (
            <Text style={styles.muted}>{pdfText.noWorkers}</Text>
          )}
        </View>

        {/* SUMMARY */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>{pdfText.summary}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.paragraph}>
              {summary || pdfText.noSummary}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>{pdfText.generatedBy}</Text>
        </View>

      </Page>

      {/* IMAGE PAGES */}
      {imagePages.map((group, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>

          <View style={styles.header}>
            <View style={styles.headerGoldLine} />
            <View style={styles.headerInner}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>{pdfText.photos}</Text>
                <Text style={styles.headerLocation}>
                  {projectDescription || projectName}
                </Text>
              </View>
              <View style={styles.headerDateBox}>
                <Text style={styles.headerDateLabel}>{pdfText.date}</Text>
                <Text style={styles.headerDateValue}>{formatDate(reportDate)}</Text>
              </View>
            </View>
          </View>

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

          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>
              {pdfText.generatedBy}{"   |   "}Page {pageIndex + 2}
            </Text>
          </View>

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const NAVY  = "#0D1B2A";
const GOLD  = "#C9A84C";
const WHITE = "#FFFFFF";
const OFF_WHITE = "#F7F6F2";
const SLATE = "#6B7280";
const INK   = "#1C1C1C";
const DIVIDER = "#D4C9A8";

const styles = StyleSheet.create({

  page: {
    backgroundColor: OFF_WHITE,
    paddingBottom: 56,
    fontFamily: "Helvetica",
    fontSize: 11,
  },

  // ── Header ──
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  headerGoldLine: {
    height: 4,
    backgroundColor: GOLD,
    marginBottom: 16,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerEyebrow: {
    fontSize: 7,
    color: GOLD,
    letterSpacing: 2,
    marginBottom: 4,
    fontFamily: "Helvetica",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    lineHeight: 1.2,
    marginBottom: 4,
  },
  headerLocation: {
    fontSize: 9,
    color: "#90A8C0",
    marginBottom: 6,
  },
  headerReportLabel: {
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1,
    marginTop: 2,
  },
  headerDateBox: {
    backgroundColor: GOLD,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 100,
  },
  headerDateLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 1,
    marginBottom: 3,
  },
  headerDateValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "center",
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 32,
    marginTop: 18,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: DIVIDER,
    paddingBottom: 5,
  },
  sectionTitleBar: {
    width: 3,
    height: 12,
    backgroundColor: GOLD,
    marginRight: 8,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    letterSpacing: 0.5,
  },

  listItem: {
    fontSize: 10,
    color: INK,
    marginBottom: 4,
    paddingLeft: 4,
  },

  muted: {
    fontSize: 10,
    color: SLATE,
    fontStyle: "italic",
  },

  paragraph: {
    fontSize: 10,
    color: INK,
    lineHeight: 1.5,
  },

  summaryBox: {
    backgroundColor: WHITE,
    borderLeftWidth: 3,
    borderLeftColor: NAVY,
    padding: 10,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 14,
  },
  footerLine: {
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 8,
    color: SLATE,
    textAlign: "center",
  },

  // ── Image grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 20,
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
    color: SLATE,
  },
});