import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

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

type Workers = {
  partition: number;
  ceiling: number;
  mne: number;
  flooring: number;
  brickwork: number;
  carpenter: number;
  painter: number;
  others: { label: string; count: number }[];
};


type ImageItem = {
  image_url: string;
  caption?: string | null;
};

type Props = {
  projectName: string;
  projectDescription?: string | null;
  reportDate: string;
  summary: string | null;
  images: ImageItem[];
  weather: WeatherItem[];
  materials: MaterialItem[];
  equipment: EquipmentItem[];
  workers: Workers;
};
export default function ReportPDF({
  projectName,
   projectDescription,
  reportDate,
  summary,
  images,
  weather,
  materials,
  equipment,
  workers,
}: Props) {
  const imagePages = chunk(images, 6);

  return (
    <Document>

      {/* ================= PAGE 1 : SUMMARY ================= */}
<Page size="A4" style={styles.page}>

<View style={styles.sectionBlock}>
  {projectDescription && (
  <Text style={styles.project}>
   PROJECT: {projectDescription}
  </Text>
)}
</View>

  <Text style={styles.subtitle}>Site Diary Record</Text>
  <Text style={styles.date}>
  Date: {formatDate(reportDate)}
</Text>

<View style={styles.sectionBlock}>
  {/* WEATHER */}
  <Text style={styles.section}>Weather</Text>
  {weather.length === 0 ? (
    <Text style={styles.muted}>No weather recorded</Text>
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
    <Text style={styles.section}>Materials Delivered</Text>
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
    <Text style={styles.section}>Machinery / Equipment</Text>
    {equipment.map((e, i) => (
      <Text key={i} style={styles.listItem}>
        • {e.name} – {e.qty} – {e.status}
      </Text>
    ))}
  </>
)}
</View>

  {/* WORKERS */}
      <View style={styles.sectionBlock}>
<Text style={styles.section}>Workers</Text>

{(
  [
    ["Partition", workers.partition],
    ["Ceiling", workers.ceiling],
    ["M&E", workers.mne],
    ["Flooring", workers.flooring],
    ["Brickwork", workers.brickwork],
    ["Carpenter", workers.carpenter],
    ["Painter", workers.painter],
  ] as [string, number][]
)
  .filter(([, count]) => count > 0)
  .map(([label, count], i) => (
    <Text key={i} style={styles.listItem}>
      • {label}: {count}
    </Text>
  ))}

{/* OTHERS */}
{workers.others
  .filter((o) => o.count > 0 && o.label.trim() !== "")
  .map((o, i) => (
    <Text key={`other-${i}`} style={styles.listItem}>
      • {o.label}: {o.count}
    </Text>
  ))}

{/* IF EMPTY*/}
{[
  workers.partition,
  workers.ceiling,
  workers.mne,
  workers.flooring,
  workers.brickwork,
  workers.carpenter,
  workers.painter,
  ...workers.others.map((o) => o.count),
].every((c) => c === 0) && (
  <Text style={styles.muted}>No workers recorded</Text>
)}
</View>

      <View style={styles.sectionBlock}>
  {/* SUMMARY */}
  <Text style={styles.section}>Summary</Text>
  <Text style={styles.paragraph}>
    {summary || "No summary provided."}
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
