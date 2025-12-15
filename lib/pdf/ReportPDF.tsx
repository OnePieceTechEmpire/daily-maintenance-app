import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type ImageItem = {
  image_url: string;
  caption?: string | null;
};

type Props = {
  projectName: string;
  reportDate: string;
  summary?: string | null;
  images: ImageItem[];
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },

  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },

  projectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
  },

  subtitle: {
    fontSize: 12,
    color: "#374151",
    marginTop: 2,
  },

  date: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },

  section: {
    marginTop: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },

  summaryBox: {
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryText: {
    fontSize: 11,
    color: "#374151",
  },

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },

  imageItem: {
    width: "48%",
    marginRight: "4%",
    marginBottom: 12,
  },

  image: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 4,
  },

  caption: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 4,
  },

  footer: {
    marginTop: 30,
    fontSize: 9,
    textAlign: "center",
    color: "#9ca3af",
  },
});

export default function ReportPDF({
  projectName,
  reportDate,
  summary,
  images,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.projectName}>{projectName}</Text>
          <Text style={styles.subtitle}>Daily Maintenance Report</Text>
          <Text style={styles.date}>Date: {reportDate}</Text>
        </View>

        {/* SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              {summary || "No summary provided."}
            </Text>
          </View>
        </View>

        {/* IMAGES */}
        {images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>

            <View style={styles.imageGrid}>
              {images.map((img, i) => (
                <View key={i} style={styles.imageItem}>
                  <Image src={img.image_url} style={styles.image} />
                  {img.caption && (
                    <Text style={styles.caption}>{img.caption}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          Generated automatically by Site Maintenance System
        </Text>

      </Page>
    </Document>
  );
}
