import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

type ImageItem = {
  image_url: string;
  caption?: string | null;
};

type Props = {
  projectName: string;
  reportDate: string;
  summary: string | null;
  images: ImageItem[];
};

export default function ReportPDF({
  projectName,
  reportDate,
  summary,
  images,
}: Props) {
  const imagePages = chunk(images, 6);

  return (
    <Document>

      {/* ================= PAGE 1 : SUMMARY ================= */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.project}>{projectName}</Text>
        <Text style={styles.subtitle}>Daily Maintenance Report</Text>
        <Text style={styles.date}>Date: {reportDate}</Text>

        <Text style={styles.section}>Summary</Text>
        <Text style={styles.summary}>
          {summary || "No summary provided."}
        </Text>

        <Text style={styles.footer}>
          Generated automatically by Site Maintenance System
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
    fontSize: 18,
    fontWeight: "bold",
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
    lineHeight: 1.6,
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
});
