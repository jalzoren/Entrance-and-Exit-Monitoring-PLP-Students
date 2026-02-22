import React, {useState, useEffect} from 'react';
import '../css/Analytics.css'; // Create this CSS file for styling

const INITIAL_METRICS = {
  totalStudents: 10000,
  currentStudentsInside: 5500,
};

const INITIAL_TRAFFIC_DATA = [
  { date: 'Mon', entrance: 1240, exit: 1221 },
  { date: 'Tue', entrance: 1421, exit: 1229 },
  { date: 'Wed', entrance: 1100, exit: 1200 },
  { date: 'Thu', entrance: 1478, exit: 1200 },
  { date: 'Fri', entrance: 1189, exit: 1218 },
  { date: 'Sat', entrance: 1200, exit: 1250 },
];

const INITIAL_COLLEGE_DATA = [
  {
    id: 1,
    collegeName: 'College of Computer Studies',
    presenceNow: 2400,
    totalStudents: 3000,
    percentage: 80,
  },
  {
    id: 2,
    collegeName: 'College of Nursing',
    presenceNow: 1250,
    totalStudents: 2500,
    percentage: 50,
  },
  {
    id: 3,
    collegeName: 'College of Engineering',
    presenceNow: 200,
    totalStudents: 1000,
    percentage: 20,
  },
];


const INITIAL_AUTH_DATA = [
  { id: 1, method: 'Facial Recognition', attempts: 300, success: 270, successRate: '90% (detected)' },
  { id: 2, method: 'Manual Input', attempts: 100, success: 100, successRate: '100% (detected)' },
];

function Analytics() {
  const [metrics, setMetrics] = useState(INITIAL_METRICS);

  const [trafficData, setTrafficData] = useState(INITIAL_TRAFFIC_DATA);
  const [collegeData, setCollegeData] = useState(INITIAL_COLLEGE_DATA);
  const [authData, setAuthData] = useState(INITIAL_AUTH_DATA);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {

    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (window.electronAPI) {

          const data = await window.electronAPI.invoke('get-analytics-data', {
            timeRange,
          });
          
          if (data) {
            setMetrics(data.metrics || INITIAL_METRICS);
            setTrafficData(data.trafficData || INITIAL_TRAFFIC_DATA);
            setCollegeData(data.collegeData || INITIAL_COLLEGE_DATA);
            setAuthData(data.authData || INITIAL_AUTH_DATA);
          }
        } else {

          console.warn('Electron API not available, using sample data');

        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();

  }, [timeRange]);


  return (
  <div className="analytics-container">
        <div className="analytics-header">
          <h1>ANALYTICS & REPORTS</h1>
          <p className="breadcrumb">Dashboard / Analytics & Reports</p>
        </div>

        <div className="metrics-row">
          {/* Card 1: Total Students */}
          <div className="metric-card">
            <div className="metric-value">{metrics.totalStudents.toLocaleString()}</div>
            <div className="metric-label">TOTAL STUDENTS</div>
          </div>

          {/* Card 2: Current Students Inside */}
          <div className="metric-card">
            <div className="metric-value">{metrics.currentStudentsInside.toLocaleString()}</div>
            <div className="metric-label">CURRENT STUDENTS INSIDE</div>
          </div>
        </div>

        {isLoading && (
          <div className="loading-state">
            <p>Loading analytics data...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* SECTION 1: DAILY TRAFFIC TREND */}
            <section className="chart-section">
              <div className="section-header">
                <h2>Daily Traffic Trend (Entries and Exits)</h2>
                <div className="time-range-selector">

                  <button
                    className={`range-btn ${timeRange === '7days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('7days')}
                  >
                    7 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '30days' ? 'active' : ''}`}
                    onClick={() => setTimeRange('30days')}
                  >
                    30 Days
                  </button>
                  <button
                    className={`range-btn ${timeRange === '1year' ? 'active' : ''}`}
                    onClick={() => setTimeRange('1year')}
                  >
                    1 Year
                  </button>
                </div>
              </div>

              <TrafficChart data={trafficData} />

              {/* INSIGHTS SECTION */}
              <div className="insights">
                <h4>Insights:</h4>
                <ul>
                  <li>
                    <strong>Highest traffic:</strong> Wednesday (1,240 entrances)
                  </li>
                  <li>
                    <strong>Lowest traffic:</strong> Sunday (1,100 entrances)
                  </li>
                  <li>
                    <strong>Peak hour today:</strong> 8:15 AM (350 entrances)
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 2: COLLEGE DISTRIBUTION */}
            <section className="chart-section charts-grid">
              <div className="chart-box">
                <div className="chart-header">
                  <h3>College Distribution (Current Campus Population)</h3>
                  <button className="info-btn">ℹ</button>
                </div>

                <CollegeDistributionChart data={collegeData} />

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>College</th>
                      <th>Present Now</th>
                      <th>Total of Students</th>
                      <th>% of Campus</th>
                    </tr>
                  </thead>
                  <tbody>

                    {collegeData.map((college) => (
                      <tr key={college.id}>
                        <td>{college.id}</td>
                        <td>{college.collegeName}</td>
                        <td>{college.presenceNow}</td>
                        <td>{college.totalStudents}</td>
                        <td>{college.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button className="prev-btn">← Previous</button>
                  <span className="page-info">
                    Page <strong>1</strong> of <strong>67</strong>
                  </span>
                  <button className="next-btn">Next →</button>
                </div>
              </div>

              {/* SECTION 3: AUTHENTICATION METHOD */}
              <div className="chart-box">
                <div className="chart-header">
                  <h3>Authentication Method Usage</h3>
                  <button className="info-btn">ℹ</button>
                </div>

                <AuthenticationChart data={authData} />

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Method</th>
                      <th>Attempts</th>
                      <th>Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authData.map((auth, index) => (
                      <tr key={auth.id}>
                        <td>{index + 1}</td>
                        <td>{auth.method}</td>
                        <td>{auth.attempts}</td>
                        <td>{auth.successRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
  );
}

function TrafficChart({ data }) {

  return (
    <div className="traffic-chart-container">
      <div className="chart-placeholder">
        <p>Chart Area - Use Recharts library for actual chart</p>

        <div className="data-preview">
          {data.map((entry) => (
            <div key={entry.date} className="day-data">
              <strong>{entry.date}:</strong> In: {entry.entrance}, Out: {entry.exit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollegeDistributionChart({ data }) {
  return (
    <div className="college-distribution-container">
      <div className="chart-placeholder">
        <p>College Distribution Chart - Use Recharts BarChart</p>
        <div className="bar-preview">
          {data.map((college) => (
            <div key={college.id} className="bar-item">
              <label>{college.collegeName}</label>
              <div className="bar-wrapper">
                <div
                  className="bar-fill"
                  style={{ width: `${college.percentage}%` }}
                >
                  {college.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function AuthenticationChart({ data }) {

  const total = data.reduce((sum, item) => sum + item.attempts, 0);
  
  return (
    <div className="auth-chart-container">
      <div className="chart-placeholder">
        <p>Authentication Methods - Use Recharts PieChart</p>
        <div className="pie-preview">
          {data.map((auth) => {
            const percentage = ((auth.attempts / total) * 100).toFixed(1);
            return (
              <div key={auth.id} className="pie-segment">
                <span className="segment-label">{auth.method}:</span>
                <span className="segment-value">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Analytics