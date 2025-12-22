// GeoJSON type definitions
declare namespace GeoJSON {
  export interface Polygon {
    type: "Polygon";
    coordinates: number[][][];
  }
  
  export interface MultiPolygon {
    type: "MultiPolygon";
    coordinates: number[][][][];
  }
  
  export interface Point {
    type: "Point";
    coordinates: number[];
  }
  
  export interface LineString {
    type: "LineString";
    coordinates: number[][];
  }
  
  export interface MultiPoint {
    type: "MultiPoint";
    coordinates: number[][];
  }
  
  export interface MultiLineString {
    type: "MultiLineString";
    coordinates: number[][][];
  }
  
  export interface GeometryCollection {
    type: "GeometryCollection";
    geometries: Geometry[];
  }
  
  export type Geometry = Polygon | MultiPolygon | Point | LineString | MultiPoint | MultiLineString | GeometryCollection;
  
  export interface Feature {
    type: "Feature";
    geometry: Geometry;
    properties?: Record<string, any>;
  }
  
  export interface FeatureCollection {
    type: "FeatureCollection";
    features: Feature[];
  }
}

