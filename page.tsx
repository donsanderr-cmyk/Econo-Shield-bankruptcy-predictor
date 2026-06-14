"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  Gauge,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFinancialSnapshot,
  formatCurrency,
  formatPercent,
  toNumber
} from "@/lib/calculations";
import type { FinancialInput, InventoryItem, UserSegment } from "@/lib/types";

const defaultInput: FinancialInput = {
  segment: "msme",
  monthlyIncome: 45000000,
  fixedExpense: 16500000,
  variableExpense: 8700000,
  savingsAsset: 65000000,
  physicalAsset: 120000000,
  investmentValue: 25000000,
  debt: 42000000,
  biRate: 6,
  inflationRate: 4.2,
  incomeShock: 20
};

const defaultInventory: InventoryItem[] = [
  { id: "inv-1", name: "Bahan baku utama", quantity: 120, unitCost: 85000 },
  { id: "inv-2", name: "Produk siap jual", quantity: 75, unitCost: 145000 }
];

const chartColors = ["#16757a", "#f0a72f", "#384b5f", "#3f9f74"];

const scenarioPresets = [
  {
    id: "normal",
    label: "Normal",
    description: "Tekanan rendah",
    patch: { incomeShock: 5, inflationRate: 3.5, biRate: 5.5 }
  },
  {
    id: "warning",
    label: "Waspada",
    description: "Pendapatan turun",
    patch: { incomeShock: 25, inflationRate: 5.8, biRate: 6.7 }
  },
  {
    id: "crisis",
    label: "Krisis",
    description: "Stress tinggi",
    patch: { incomeShock: 55, inflationRate: 9.5, biRate: 8.2 }
  }
];

export default function Home() {
  const [input, setInput] = useState<FinancialInput>(defaultInput);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(defaultInventory);
  const [activeScenario, setActiveScenario] = useState("warning");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const snapshot = useMemo(() => calculateFinancialSnapshot(input, inventoryItems), [input, inventoryItems]);

  const chartData = [
    { label: "Pemasukan", value: snapshot.stressedIncome },
    { label: "Pengeluaran", value: snapshot.totalExpense },
    { label: "Total Aset", value: snapshot.totalAssets },
    { label: "Investasi", value: input.investmentValue }
  ];
  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);

  const updateInput = (key: keyof FinancialInput, value: number | UserSegment) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const applyScenario = (scenarioId: string) => {
    const scenario = scenarioPresets.find((item) => item.id === scenarioId);
    if (!scenario) return;
    setActiveScenario(scenario.id);
    setInput((current) => ({ ...current, ...scenario.patch }));
  };

  const updateInventoryName = (id: string, name: string) => {
    setInventoryItems((items) => items.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const updateInventoryNumber = (id: string, key: "quantity" | "unitCost", value: number) => {
    setInventoryItems((items) => items.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const addInventoryRow = () => {
    setInventoryItems((items) => [
      ...items,
      { id: `inv-${Date.now()}`, name: "Item baru", quantity: 1, unitCost: 0 }
    ]);
  };

  const removeInventoryRow = (id: string) => {
    setInventoryItems((items) => items.filter((item) => item.id !== id));
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.split(",").map((cell) => cell.trim()))
      .filter((row) => row.length >= 3);

    const parsedItems = rows.slice(1).map((row, index) => ({
      id: `csv-${Date.now()}-${index}`,
      name: row[0] || `Item ${index + 1}`,
      quantity: Number(row[1]) || 0,
      unitCost: Number(row[2]) || 0
    }));

    if (parsedItems.length > 0) {
      setInventoryItems(parsedItems);
    }
  };

  const exportSnapshot = () => {
    const payload = JSON.stringify({ input, inventoryItems, snapshot }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "econo-shield-snapshot.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginName.trim()) {
      setLoginError("Masukkan nama terlebih dahulu.");
      return;
    }

    if (password !== "wealth") {
      setLoginError("Sandi belum sesuai.");
      return;
    }

    setLoginError("");
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-2xl">Masuk Econo-Shield</CardTitle>
            <CardDescription>
              Gunakan nama bebas dan sandi akses untuk membuka dashboard finansial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleLogin}>
              <div className="grid gap-2">
                <Label htmlFor="login-name">Nama</Label>
                <Input
                  id="login-name"
                  value={loginName}
                  placeholder="Contoh: Andi / Toko Maju"
                  onChange={(event) => setLoginName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Sandi</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  placeholder="Masukkan sandi"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {loginError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {loginError}
                </p>
              ) : null}
              <Button type="submit" className="w-full">
                Masuk Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
              <ShieldCheck className="h-4 w-4" />
              Econo-Shield
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              Econo-Shield Crisis Guard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Membantu UMKM dan individu membaca kondisi finansial, menguji tekanan krisis,
              dan menjaga keputusan tetap terukur dan objektif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={input.segment === "individual" ? "primary" : "secondary"} onClick={() => updateInput("segment", "individual")}>
              Individu
            </Button>
            <Button variant={input.segment === "msme" ? "primary" : "secondary"} onClick={() => updateInput("segment", "msme")}>
              UMKM
            </Button>
            <Button variant="ghost" onClick={exportSnapshot} title="Export snapshot">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {scenarioPresets.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => applyScenario(scenario.id)}
              className={`rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 ${
                activeScenario === scenario.id
                  ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
                  : "border-border bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{scenario.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p>
                </div>
                <Gauge className="h-5 w-5 text-primary" />
              </div>
            </button>
          ))}
        </section>

        <section className="grid metric-grid gap-4">
          <MetricCard title="Skor Finansial" value={`${snapshot.financialScore}/100`} caption={snapshot.riskStatus} tone={snapshot.riskStatus} />
          <MetricCard title="Aset Net" value={formatCurrency(snapshot.netWorth)} caption="Total aset dikurangi utang" />
          <MetricCard title="Cash Runway" value={`${snapshot.cashRunway.toFixed(1)} bulan`} caption="Aset likuid / burn rate" />
          <MetricCard title="Rasio Utang" value={formatPercent(snapshot.debtRatio)} caption="Utang / pemasukan tahunan" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Input Finansial</CardTitle>
                <CardDescription>Nilai dapat diubah langsung untuk melihat hasil kalkulasi real-time.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <NumberField label="Pendapatan / Penjualan Bulanan" value={input.monthlyIncome} onChange={(value) => updateInput("monthlyIncome", value)} />
                <NumberField label="Pengeluaran Tetap / Operasional" value={input.fixedExpense} onChange={(value) => updateInput("fixedExpense", value)} />
                <NumberField label="Pengeluaran Variabel / HPP" value={input.variableExpense} onChange={(value) => updateInput("variableExpense", value)} />
                <NumberField label="Aset Likuid / Tabungan" value={input.savingsAsset} onChange={(value) => updateInput("savingsAsset", value)} />
                <NumberField label="Nilai Investasi" value={input.investmentValue} onChange={(value) => updateInput("investmentValue", value)} />
                <NumberField label="Aset Fisik" value={input.physicalAsset} onChange={(value) => updateInput("physicalAsset", value)} />
                <NumberField label="Cicilan / Utang" value={input.debt} onChange={(value) => updateInput("debt", value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Stress Test Makro</CardTitle>
                    <CardDescription>Uji dampak penurunan pemasukan dan tekanan inflasi/BI Rate.</CardDescription>
                  </div>
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderField label="Penurunan Pemasukan" value={input.incomeShock} suffix="%" min={0} max={80} onChange={(value) => updateInput("incomeShock", value)} />
                <SliderField label="Inflasi IHK" value={input.inflationRate} suffix="%" min={0} max={15} step={0.1} onChange={(value) => updateInput("inflationRate", value)} />
                <SliderField label="BI Rate" value={input.biRate} suffix="%" min={1} max={12} step={0.1} onChange={(value) => updateInput("biRate", value)} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Visualisasi 4 Pilar</CardTitle>
                  <CardDescription>Pemasukan, pengeluaran, aset, dan investasi setelah stress test.</CardDescription>
                </div>
                <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Real-time
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartData.map((item, index) => (
                    <div key={item.label} className="grid gap-2 sm:grid-cols-[120px_1fr_150px] sm:items-center">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="h-9 overflow-hidden rounded-md bg-muted">
                        <div
                          className="h-full rounded-md transition-all duration-300"
                          style={{
                            width: `${Math.max((item.value / maxChartValue) * 100, 2)}%`,
                            backgroundColor: chartColors[index]
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground sm:text-right">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Inventaris UMKM</CardTitle>
                  <CardDescription>Total Nilai Inventaris = Sigma(Q x P), terhubung ke total aset.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-medium hover:bg-accent">
                    <Upload className="mr-2 h-4 w-4" />
                    CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                  <Button variant="secondary" size="sm" onClick={addInventoryRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-2">Nama Barang</th>
                        <th className="px-2">Q</th>
                        <th className="px-2">P / Unit</th>
                        <th className="px-2 text-right">Nilai</th>
                        <th className="w-10 px-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => (
                        <tr key={item.id} className="bg-muted/60">
                          <td className="rounded-l-md p-2">
                            <Input value={item.name} onChange={(event) => updateInventoryName(item.id, event.target.value)} />
                          </td>
                          <td className="p-2">
                            <Input type="number" value={item.quantity} onChange={(event) => updateInventoryNumber(item.id, "quantity", toNumber(event.target.value))} />
                          </td>
                          <td className="p-2">
                            <Input type="number" value={item.unitCost} onChange={(event) => updateInventoryNumber(item.id, "unitCost", toNumber(event.target.value))} />
                          </td>
                          <td className="p-2 text-right font-semibold">{formatCurrency(item.quantity * item.unitCost)}</td>
                          <td className="rounded-r-md p-2">
                            <Button variant="ghost" size="icon" onClick={() => removeInventoryRow(item.id)} title="Hapus item">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-md bg-accent p-4 text-sm font-semibold text-accent-foreground">
                  Total inventaris: {formatCurrency(snapshot.inventoryValue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Risiko</CardTitle>
                <CardDescription>Klasifikasi transparan berbasis rumus, bukan AI advisory.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-secondary p-2 text-secondary-foreground">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">{snapshot.riskStatus}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{snapshot.statusReason}</p>
                  </div>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">Daya beli riil</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(snapshot.realPurchasingPower)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Pendapatan tertekan / (1 + inflasi)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  caption,
  tone
}: {
  title: string;
  value: string;
  caption: string;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-3 text-2xl font-semibold">{value}</p>
        <p className={`mt-2 text-sm ${tone === "Bankrupt" ? "text-destructive" : tone === "Resilient" ? "text-primary" : "text-muted-foreground"}`}>
          {caption}
        </p>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(toNumber(event.target.value))} />
    </div>
  );
}

function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-sm font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[hsl(var(--primary))]"
      />
    </div>
  );
}
