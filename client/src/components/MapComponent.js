import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Create a custom colored DivIcon with an SVG pin marker
 */
const createColoredIcon = (color, label) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="position:relative;width:32px;height:42px;">
                <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" 
                          fill="${color}" stroke="white" stroke-width="2"/>
                    <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
                    <text x="16" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="${color}">${label}</text>
                </svg>
                <div style="position:absolute;top:0;left:0;width:32px;height:42px;animation:markerPulse 2s infinite;border-radius:50%;pointer-events:none;"></div>
            </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
    });
};

// Pre-built icons for the 3 marker types
const MARKER_ICONS = {
    volunteer: createColoredIcon('#3b82f6', 'V'),   // Blue
    pickup: createColoredIcon('#22c55e', 'P'),       // Green
    delivery: createColoredIcon('#ef4444', 'D'),     // Red
    default: DefaultIcon,
};

/**
 * Component to auto-fit map bounds to show all markers and route
 */
const FitBounds = ({ markers, routeCoords }) => {
    const map = useMap();

    useEffect(() => {
        const points = [];

        // Add marker positions
        if (markers && markers.length > 0) {
            markers.forEach(m => {
                if (m.lat && m.lng) {
                    points.push([m.lat, m.lng]);
                }
            });
        }

        // Add route coordinates (sample every Nth point for performance)
        if (routeCoords && routeCoords.length > 0) {
            const step = Math.max(1, Math.floor(routeCoords.length / 50));
            for (let i = 0; i < routeCoords.length; i += step) {
                points.push(routeCoords[i]);
            }
            // Always include last point
            points.push(routeCoords[routeCoords.length - 1]);
        }

        if (points.length >= 2) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } else if (points.length === 1) {
            map.setView(points[0], 15);
        }
    }, [markers, routeCoords, map]);

    return null;
};

/**
 * Component to recenter map when coordinates change (fallback for single-marker)
 */
const RecenterMap = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.setView([lat, lng]);
        }
    }, [lat, lng, map]);
    return null;
};

/**
 * Map legend overlay
 */
const MapLegend = ({ markers }) => {
    const types = [...new Set(markers.filter(m => m.lat && m.lng).map(m => m.type))];
    if (types.length <= 1) return null;

    const legendItems = {
        volunteer: { color: '#3b82f6', label: 'Volunteer' },
        pickup: { color: '#22c55e', label: 'Pickup' },
        delivery: { color: '#ef4444', label: 'Delivery' },
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
        }}>
            {types.map(type => {
                const item = legendItems[type];
                if (!item) return null;
                return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: item.color,
                            display: 'inline-block',
                            boxShadow: `0 0 4px ${item.color}60`,
                        }} />
                        {item.label}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Route info overlay card
 */
const RouteInfoOverlay = ({ routeInfo }) => {
    if (!routeInfo) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1000,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: '140px',
        }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8553f4' }}>
                        {routeInfo.totalDistance} km
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Distance
                    </div>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'rgba(0,0,0,0.1)' }} />
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00d2d3' }}>
                        {routeInfo.totalDuration} min
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ETA
                    </div>
                </div>
            </div>
        </div>
    );
};


const MapComponent = ({
    center = { lat: 20.5937, lng: 78.9629 }, // Default to India center
    zoom = 13,
    markers = [],
    routeGeometry = null,  // GeoJSON LineString from OSRM
    routeInfo = null,      // { totalDistance, totalDuration, legs }
    className = "leaflet-map",
    height = '400px',
}) => {
    // Filter out invalid markers
    const validMarkers = markers.filter(m => m.lat && m.lng);

    // If no center provided but we have markers, center on the first marker
    const mapCenter = (center.lat && center.lng)
        ? [center.lat, center.lng]
        : (validMarkers.length > 0 ? [validMarkers[0].lat, validMarkers[0].lng] : [20.5937, 78.9629]);

    // Convert GeoJSON geometry to Leaflet-compatible coordinate array
    const routeCoords = useMemo(() => {
        if (!routeGeometry?.coordinates) return null;
        // GeoJSON is [lng, lat] — Leaflet needs [lat, lng]
        return routeGeometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }, [routeGeometry]);

    const hasMultipleMarkers = validMarkers.length >= 2;
    const hasRoute = routeCoords && routeCoords.length > 0;

    return (
        <div className="map-container" style={{
            height,
            width: '100%',
            marginBottom: '20px',
            borderRadius: '14px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.6)',
        }}>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {validMarkers.map((marker, idx) => (
                    <Marker
                        key={`${marker.type}-${idx}`}
                        position={[marker.lat, marker.lng]}
                        icon={MARKER_ICONS[marker.type] || MARKER_ICONS.default}
                    >
                        <Popup>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {marker.popup || 'Location'}
                            </div>
                            {marker.details && (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                    {marker.details}
                                </div>
                            )}
                        </Popup>
                    </Marker>
                ))}

                {/* Route polyline */}
                {hasRoute && (
                    <>
                        {/* Shadow/outline */}
                        <Polyline
                            positions={routeCoords}
                            pathOptions={{
                                color: '#1e293b',
                                weight: 7,
                                opacity: 0.15,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }}
                        />
                        {/* Main route line */}
                        <Polyline
                            positions={routeCoords}
                            pathOptions={{
                                color: '#8553f4',
                                weight: 5,
                                opacity: 0.85,
                                lineCap: 'round',
                                lineJoin: 'round',
                                dashArray: null,
                            }}
                        />
                    </>
                )}

                {/* Auto-fit when we have route or multiple markers */}
                {(hasMultipleMarkers || hasRoute) ? (
                    <FitBounds markers={validMarkers} routeCoords={routeCoords} />
                ) : (
                    <RecenterMap lat={mapCenter[0]} lng={mapCenter[1]} />
                )}
            </MapContainer>

            {/* Overlays */}
            <MapLegend markers={validMarkers} />
            <RouteInfoOverlay routeInfo={routeInfo} />
        </div>
    );
};

export default MapComponent;
