import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatGBP } from '../api';
import type { AnalysisReport } from '../types';

// Chart tokens: one series per chart, so a single categorical hue; text stays in ink colors.
const SERIES = '#2a78d6';
const GRID = '#e5e7eb';
const AXIS_TEXT = '#52514e';

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const compactGBP = (n: number) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${Math.round(n)}`);

function ChartTooltip({ active, payload, label, title }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  title: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="muted small">{title(String(label))}</div>
      <strong>{formatGBP(payload[0].value)}</strong>
    </div>
  );
}

export function AnalysisView({ report }: { report: AnalysisReport }) {
  const { stats, summary } = report;
  const hasSpending = stats.byCategory.length > 0;

  return (
    <div className="analysis">
      <section className="card summary-card">
        <span className="muted small">
          {report.source === 'STATEMENT' ? 'Statement analysis' : 'Account analysis'} · {report.title}
        </span>
        <h3 className="headline">{summary.headline}</h3>
      </section>

      <section className="stats">
        <div className="stat">
          <span className="muted">Money in</span>
          <strong>{formatGBP(stats.moneyIn)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Money out</span>
          <strong>{formatGBP(stats.moneyOut)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Net</span>
          <strong>{stats.net >= 0 ? '+' : '−'}{formatGBP(Math.abs(stats.net))}</strong>
        </div>
        <div className="stat">
          <span className="muted">Transactions</span>
          <strong>{stats.transactionCount}</strong>
        </div>
      </section>

      {hasSpending && (
        <div className="grid two-equal">
          <section className="card">
            <h3>Spending by category</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, stats.byCategory.length * 34 + 20)}>
              <BarChart data={stats.byCategory} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  content={<ChartTooltip title={(l) => l} />}
                />
                <Bar dataKey="amount" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(v: unknown) => formatGBP(Number(v))}
                    style={{ fill: AXIS_TEXT, fontSize: 12 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="card">
            <h3>Daily spending</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.daily} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={compactGBP}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  content={<ChartTooltip title={(l) => `Spent on ${shortDate(l)}`} />}
                />
                <Bar dataKey="spent" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}

      {(summary.insights.length > 0 || summary.recommendations.length > 0) && (
        <div className="grid two-equal">
          <section className="card">
            <h3>Expert insights</h3>
            <ul className="bullets">
              {summary.insights.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h3>Recommendations</h3>
            <ul className="bullets">
              {summary.recommendations.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="muted small">General guidance only, not regulated financial advice.</p>
          </section>
        </div>
      )}

      {stats.topMerchants.length > 0 && (
        <section className="card">
          <h3>Top places you spent</h3>
          <ul className="list">
            {stats.topMerchants.map((m) => (
              <li key={m.name}>
                <span>{m.name}</span>
                <span className="muted">{m.count} payment{m.count === 1 ? '' : 's'}</span>
                <strong>{formatGBP(m.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.transactions.length > 0 && (
        <details className="card">
          <summary>
            <strong>All {report.transactions.length} transactions analysed</strong>
          </summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.transactions.map((t, i) => (
                  <tr key={i}>
                    <td>{shortDate(t.date)}</td>
                    <td>{t.merchant && t.merchant !== t.description ? `${t.description} · ${t.merchant}` : t.description}</td>
                    <td>{t.category}</td>
                    <td className={t.type === 'CREDIT' ? 'num credit' : 'num'}>
                      {t.type === 'CREDIT' ? '+' : '−'}
                      {formatGBP(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
