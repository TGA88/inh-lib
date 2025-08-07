#!/bin/bash

# Import Grafana dashboard for app-unified traces
echo "Importing Grafana dashboard..."

# Create import payload
cat > /tmp/dashboard-import.json << 'EOF'
{
  "dashboard": {
    "annotations": {
      "list": [
        {
          "builtIn": 1,
          "datasource": {
            "type": "grafana",
            "uid": "-- Grafana --"
          },
          "enable": true,
          "hide": true,
          "iconColor": "rgba(0, 211, 255, 1)",
          "name": "Annotations & Alerts",
          "type": "dashboard"
        }
      ]
    },
    "description": "Tracing dashboard for app-unified service with trace visualization, performance metrics and error tracking",
    "editable": true,
    "fiscalYearStartMonth": 0,
    "graphTooltip": 0,
    "id": null,
    "links": [],
    "liveNow": false,
    "panels": [
      {
        "datasource": {
          "type": "tempo",
          "uid": "tempo"
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "hideFrom": {
                "legend": false,
                "tooltip": false,
                "vis": false
              }
            },
            "mappings": []
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        },
        "id": 1,
        "options": {
          "legend": {
            "displayMode": "list",
            "placement": "bottom",
            "showLegend": true
          },
          "pieType": "pie",
          "reduceOptions": {
            "calcs": [
              "lastNotNull"
            ],
            "fields": "",
            "values": false
          },
          "tooltip": {
            "mode": "single",
            "sort": "none"
          }
        },
        "targets": [
          {
            "datasource": {
              "type": "tempo",
              "uid": "tempo"
            },
            "query": "{service.name=\"app-unified\"}",
            "refId": "A"
          }
        ],
        "title": "Traces by Service (app-unified)",
        "type": "piechart"
      },
      {
        "datasource": {
          "type": "tempo",
          "uid": "tempo"
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "custom": {
              "align": "auto",
              "cellOptions": {
                "type": "auto"
              },
              "inspect": false
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        },
        "id": 2,
        "options": {
          "cellHeight": "sm",
          "footer": {
            "countRows": false,
            "fields": "",
            "reducer": [
              "sum"
            ],
            "show": false
          },
          "showHeader": true
        },
        "pluginVersion": "12.2.0-16787028595",
        "targets": [
          {
            "datasource": {
              "type": "tempo",
              "uid": "tempo"
            },
            "query": "{service.name=\"app-unified\"}",
            "refId": "A"
          }
        ],
        "title": "Recent Traces",
        "type": "table"
      },
      {
        "datasource": {
          "type": "loki",
          "uid": "loki"
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "axisCenteredZero": false,
              "axisColorMode": "text",
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": 0,
              "drawStyle": "line",
              "fillOpacity": 0,
              "gradientMode": "none",
              "hideFrom": {
                "legend": false,
                "tooltip": false,
                "vis": false
              },
              "insertNulls": false,
              "lineInterpolation": "linear",
              "lineWidth": 1,
              "pointSize": 5,
              "scaleDistribution": {
                "type": "linear"
              },
              "showPoints": "auto",
              "spanNulls": false,
              "stacking": {
                "group": "A",
                "mode": "none"
              },
              "thresholdsStyle": {
                "mode": "off"
              }
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 8
        },
        "id": 3,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom",
            "showLegend": true
          },
          "tooltip": {
            "mode": "single",
            "sort": "none"
          }
        },
        "targets": [
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "rate({container_name=\"app-unified\"}[5m])",
            "refId": "A"
          }
        ],
        "title": "Log Rate",
        "type": "timeseries"
      },
      {
        "datasource": {
          "type": "loki",
          "uid": "loki"
        },
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "align": "auto",
              "cellOptions": {
                "type": "auto"
              },
              "inspect": false
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          },
          "overrides": []
        },
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 16
        },
        "id": 4,
        "options": {
          "cellHeight": "sm",
          "footer": {
            "countRows": false,
            "fields": "",
            "reducer": [
              "sum"
            ],
            "show": false
          },
          "showHeader": true,
          "sortBy": [
            {
              "desc": true,
              "displayName": "Time"
            }
          ]
        },
        "pluginVersion": "12.2.0-16787028595",
        "targets": [
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "{container_name=\"app-unified\"} | json | traceId != \"\"",
            "refId": "A"
          }
        ],
        "title": "Logs with Trace IDs",
        "type": "table"
      }
    ],
    "refresh": "30s",
    "schemaVersion": 39,
    "tags": [
      "tracing",
      "app-unified",
      "observability"
    ],
    "templating": {
      "list": []
    },
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {},
    "timezone": "",
    "title": "App-Unified Tracing Dashboard",
    "uid": "app-unified-traces",
    "version": 1,
    "weekStart": ""
  },
  "overwrite": true,
  "inputs": [],
  "folderId": 0
}
EOF

# Import the dashboard
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d @/tmp/dashboard-import.json \
  http://localhost:3000/api/dashboards/db)

echo "Response: $response"

if [[ $response == *"success"* ]]; then
  echo "Dashboard imported successfully!"
  echo "Access it at: http://localhost:3000/d/app-unified-traces/app-unified-tracing-dashboard"
else
  echo "Dashboard import failed. Response: $response"
fi

# Clean up
rm /tmp/dashboard-import.json
