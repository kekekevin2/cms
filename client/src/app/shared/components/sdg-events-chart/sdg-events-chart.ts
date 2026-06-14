import { Component, AfterViewInit, OnDestroy, signal, input, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface SDGEventData {
  year: number;
  sdg_number: number;
  event_count: number;
}

@Component({
  selector: 'app-sdg-events-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sdg-events-chart.html',
})
export class SDGEventsChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  data = input.required<SDGEventData[]>();
  title = input<string>('Events per SDG per Year');
  
  chart: Chart | null = null;
  loading = signal(true);
  chartId = `sdgChart_${Math.random().toString(36).substr(2, 9)}`;
  
  // Filters
  selectedYear = signal<number | 'all'>('all');
  selectedSDG = signal<number | 'all'>('all');
  availableYears = signal<number[]>([]);
  availableSDGs = signal<number[]>([]);

  constructor() {
    // Initialize with all 17 SDGs
    this.availableSDGs.set(Array.from({ length: 17 }, (_, i) => i + 1));
    
    // Watch for data changes
    effect(() => {
      const chartData = this.data();
      console.log('SDG Chart data received:', chartData);
      if (chartData && chartData.length > 0) {
        this.updateAvailableFilters();
        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
          if (this.chart) {
            this.updateChart();
          } else {
            this.createChart();
          }
        }, 100);
      } else {
        console.log('No SDG data available');
      }
    });
  }

  ngAfterViewInit() {
    console.log('SDG Chart AfterViewInit');
    this.loading.set(false);
    // Delay chart creation to ensure DOM is ready
    setTimeout(() => {
      const data = this.data();
      if (data && data.length > 0) {
        this.createChart();
      }
    }, 300);
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  updateAvailableFilters() {
    const data = this.data();
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a);
    
    // Always show all 17 SDGs in the filter
    const allSDGs = Array.from({ length: 17 }, (_, i) => i + 1);
    
    this.availableYears.set(years);
    this.availableSDGs.set(allSDGs);
  }

  onYearChange(year: string) {
    this.selectedYear.set(year === 'all' ? 'all' : parseInt(year));
    this.updateChart();
  }

  onSDGChange(sdg: string) {
    this.selectedSDG.set(sdg === 'all' ? 'all' : parseInt(sdg));
    this.updateChart();
  }

  getFilteredData(): SDGEventData[] {
    let filtered = this.data();
    
    if (this.selectedYear() !== 'all') {
      filtered = filtered.filter((d) => d.year === this.selectedYear());
    }
    
    if (this.selectedSDG() !== 'all') {
      filtered = filtered.filter((d) => d.sdg_number === this.selectedSDG());
    }
    
    return filtered;
  }

  createChart() {
    const canvas = document.getElementById(this.chartId) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found:', this.chartId);
      this.loading.set(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      this.loading.set(false);
      return;
    }

    console.log('Creating SDG chart...');
    const chartData = this.prepareChartData();

    const config: ChartConfiguration = {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 11,
              },
              padding: 10,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const dataset = data.datasets[0];
                    const value = dataset.data[i];
                    const bgColors = dataset.backgroundColor as string[];
                    return {
                      text: `${label}: ${value} event(s)`,
                      fillStyle: bgColors[i],
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          title: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: any) => a + (b || 0), 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} event(s) (${percentage}%)`;
              },
            },
          },
        },
      },
    };

    try {
      this.chart = new Chart(ctx, config);
      console.log('SDG Chart created successfully');
      this.loading.set(false);
    } catch (error) {
      console.error('Error creating chart:', error);
      this.loading.set(false);
    }
  }

  prepareChartData() {
    const filteredData = this.getFilteredData();
    
    if (filteredData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Group by SDG and sum event counts across all years
    const sdgMap = new Map<number, number>();
    
    filteredData.forEach((item) => {
      const current = sdgMap.get(item.sdg_number) || 0;
      sdgMap.set(item.sdg_number, current + item.event_count);
    });

    // Sort by SDG number
    const sortedSDGs = Array.from(sdgMap.entries()).sort((a, b) => a[0] - b[0]);
    
    const labels = sortedSDGs.map(([sdg]) => `SDG ${sdg}: ${this.getSDGName(sdg)}`);
    const data = sortedSDGs.map(([, count]) => count);
    const colors = sortedSDGs.map(([sdg]) => this.getSDGColor(sdg));

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }

  updateChart() {
    if (!this.chart) return;
    
    const chartData = this.prepareChartData();
    this.chart.data = chartData;
    this.chart.update();
  }

  getSDGColor(sdgNumber: number): string {
    // Official UN SDG colors
    const colors: { [key: number]: string } = {
      1: '#E5243B',  // No Poverty - Red
      2: '#DDA63A',  // Zero Hunger - Yellow
      3: '#4C9F38',  // Good Health - Green
      4: '#C5192D',  // Quality Education - Dark Red
      5: '#FF3A21',  // Gender Equality - Orange Red
      6: '#26BDE2',  // Clean Water - Light Blue
      7: '#FCC30B',  // Clean Energy - Yellow
      8: '#A21942',  // Decent Work - Maroon
      9: '#FD6925',  // Industry Innovation - Orange
      10: '#DD1367', // Reduced Inequalities - Pink
      11: '#FD9D24', // Sustainable Cities - Orange
      12: '#BF8B2E', // Responsible Consumption - Brown
      13: '#3F7E44', // Climate Action - Dark Green
      14: '#0A97D9', // Life Below Water - Blue
      15: '#56C02B', // Life on Land - Light Green
      16: '#00689D', // Peace and Justice - Dark Blue
      17: '#19486A', // Partnerships - Navy
    };
    return colors[sdgNumber] || '#999999';
  }

  getColorForYear(index: number, opacity: number = 0.8): string {
    const colors = [
      `rgba(255, 99, 132, ${opacity})`,
      `rgba(54, 162, 235, ${opacity})`,
      `rgba(255, 206, 86, ${opacity})`,
      `rgba(75, 192, 192, ${opacity})`,
      `rgba(153, 102, 255, ${opacity})`,
      `rgba(255, 159, 64, ${opacity})`,
      `rgba(199, 199, 199, ${opacity})`,
      `rgba(83, 102, 255, ${opacity})`,
    ];
    return colors[index % colors.length];
  }

  getSDGName(sdg: number): string {
    const names: { [key: number]: string } = {
      1: 'No Poverty',
      2: 'Zero Hunger',
      3: 'Good Health',
      4: 'Quality Education',
      5: 'Gender Equality',
      6: 'Clean Water',
      7: 'Clean Energy',
      8: 'Decent Work',
      9: 'Industry Innovation',
      10: 'Reduced Inequalities',
      11: 'Sustainable Cities',
      12: 'Responsible Consumption',
      13: 'Climate Action',
      14: 'Life Below Water',
      15: 'Life on Land',
      16: 'Peace and Justice',
      17: 'Partnerships',
    };
    return names[sdg] || `SDG ${sdg}`;
  }
}
