export const WORKER_GROUPS = [
  {
    title: "General Construction Works",
    items: [
      { key: "concrete_worker", label: "Concrete Worker" },
      { key: "bricklayer_mason", label: "Bricklayer / Mason" },
      { key: "scaffolder", label: "Scaffolder" },
      { key: "excavator_machinery_operator", label: "Excavator / Machinery Operator" },
      { key: "lorry_driver", label: "Lorry Driver" },
    ],
  },
  {
    title: "Ceiling & Partition",
    items: [
      {
        key: "ceiling_installer",
        label: "Ceiling Installer (Gypsum / Suspended / Decorative)",
      },
      {
        key: "partition_installer",
        label: "Partition Installer (Gypsum Board / Drywall)",
      },
    ],
  },
  {
    title: "Mechanical & Electrical (M&E)",
    items: [
      { key: "electrician_wireman", label: "Electrician / Wireman" },
      { key: "aircond_technician", label: "Aircond Technician (HVAC)" },
      {
        key: "fire_protection_technician",
        label: "Fire Protection Technician (Sprinkler / Alarm)",
      },
      { key: "lift_elevator_technician", label: "Lift / Elevator Technician" },
      { key: "bms_smart_building_technician", label: "BMS / Smart Building Technician" },
      {
        key: "elv_technician",
        label: "ELV Technician (CCTV / Access Control / Intercom)",
      },
      { key: "generator_solar_technician", label: "Generator / Solar Technician" },
      { key: "plumber", label: "Plumber" },
    ],
  },
  {
    title: "Finishing Works",
    items: [
      {
        key: "floor_installer",
        label:
          "Floor Installer (Tiler / Stone / Timber / Carpet / SPC / Vinyl / Laminate)",
      },
      { key: "painter", label: "Painter" },
      {
        key: "wall_finishing_installer",
        label: "Wall Finishing Installer (Wallpaper / Decorative Panel / Feature Wall)",
      },
      { key: "glass_aluminium_installer", label: "Glass & Aluminium Installer" },
      { key: "waterproofing_specialist", label: "Waterproofing Specialist" },
      { key: "roofing_contractor", label: "Roofing Contractor" },
      { key: "cabinet_installer_carpenter", label: "Cabinet Installer / Carpenter" },
      { key: "door_window_installer", label: "Door & Window Installer" },
    ],
  },
  {
    title: "Maintenance & Facility",
    items: [
      {
        key: "general_maintenance_handyman",
        label: "General Maintenance Technician / Handyman",
      },
      { key: "pool_maintenance_technician", label: "Pool Maintenance Technician" },
      { key: "landscape_gardener", label: "Landscape / Gardener" },
      { key: "pest_control_technician", label: "Pest Control Technician" },
      {
        key: "waste_management_refuse_collector",
        label: "Waste Management / Refuse Collector",
      },
      { key: "security_guard", label: "Security Guard" },
    ],
  },
  {
    title: "Technical & Specialist",
    items: [
      { key: "it_support_network_technician", label: "IT Support / Network Technician" },
      { key: "drone_operator", label: "Drone Operator (Site Monitoring)" },
    ],
  },
] as const;

export const WORKER_LABEL_MAP: Record<string, string> = Object.fromEntries(
  WORKER_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item.label]))
);