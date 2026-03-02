import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '24px',
                    backgroundColor: '#fff4f4',
                    color: '#c00',
                    borderRadius: '12px',
                    margin: '20px',
                    border: '2px solid #ff0000',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                    maxHeight: '80vh'
                }}>
                    <h2 style={{ marginTop: 0 }}>🐾 Ouch! A bug bit Miko.</h2>
                    <p><strong>Error Message:</strong> {this.state.error?.toString()}</p>
                    <hr style={{ borderColor: '#ffcccc' }} />
                    <h3>Stack Trace:</h3>
                    <pre style={{ fontSize: '12px' }}>
                        {this.state.error?.stack}
                    </pre>
                    <hr style={{ borderColor: '#ffcccc' }} />
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#c00',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Refresh Page 🔄
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = '/';
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            marginLeft: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Data & Restart 🧹
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
