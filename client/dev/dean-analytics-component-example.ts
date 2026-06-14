// dean-analytics.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface FacultyData {
  faculty_id: number;
  faculty_name: string;
  count: number;
  percentage: string;
}

interface AnalyticsResponse {
  title: string;
  subtitle: string;
  data: FacultyData[];
  total: number;
}

@Component({
  selector: 'app-dean-analytics',
  templateUrl: './dean-analytics.component.html',
  styleUrls: ['./dean-analytics.component.css'],
})
export class DeanAnalyticsComponent implements OnInit {
  @ViewChild('researchChart') researchChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('extensionChart') extensionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('seminarsChart') seminarsChartRef!: ElementRef<HTMLCanvasElement>;

  private apiUrl = 'http://localhost:3000/api/dean/faculty-analytics';
  private charts: { [key: string]: Chart } = {};

  // Color palette
  private readonly COLORS: { [key: string]: string } = {
    Austria: '#E67E22',
    Cabael: '#3498DB',
    Geneta: '#27AE60',
    Folienta: '#8B4513',
    Hernandez: '#16697A',
    Lacbay: '#2C5F2D',
  };

  loading = {
    research: true,
    extension: true,
    seminars: true,
  };

  error = {
    research: '',
    extension: '',
    seminars: '',
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAllCharts();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private loadAllCharts(): void {
    this.loadChart('research', '/research-involvement', this.researchChartRef);
    this.loadChart('extension', '/extension-involvement', this.extensionChartRef);
    this.loadChart('seminars', '/seminars-involvement', this.seminarsChartRef);
  }

  private loadChart(
    chartKey: string,
    endpoint: string,
    chartRef: ElementRef<HTMLCanvasElement>,
  ): void {
    this.http
      .get<AnalyticsResponse>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.loading[chartKey as keyof typeof this.loading] = false;
          setTimeout(() => {
            this.createChart(chartKey, chartRef, response);
          }, 100);
        },
        error: (error) => {
          this.loading[chartKey as keyof typeof this.loading] = false;
          this.error[chartKey as keyof typeof this.error] =
            error.error?.message || 'Failed to load chart data';
          console.error(`Error loading ${chartKey} chart:`, error);
        },
      });
  }

  private createChart(
    chartKey: string,
    chartRef: ElementRef<HTMLCanvasElement>,
    data: AnalyticsResponse,
  ): void {
    if (!chartRef?.nativeElement) {
      console.error('Chart canvas not found');
      return;
    }

    const ctx = chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.charts[chartKey]) {
      this.charts[chartKey].destroy();
    }

    const labels = data.data.map((item) => item.faculty_name);
    const percentages = data.data.map((item) => parseInt(item.percentage));
    const colors = labels.map((name) => this.COLORS[name] || '#95A5A6');

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: percentages,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Georgia', 'Times New Roman', serif",
              },
              padding: 15,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels && data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    return {
                      text: `${label} ${value}%`,
                      fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}%`;
              },
            },
          },
        },
      },
    };

    this.charts[chartKey] = new Chart(ctx, config);
  }

  ngOnDestroy(): void {
    // Clean up charts
    Object.values(this.charts).forEach((chart) => chart.destroy());
  }
}
