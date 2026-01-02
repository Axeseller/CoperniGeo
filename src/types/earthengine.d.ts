declare module "@google/earthengine" {
  export interface Image {
    select(band: string): Image;
    subtract(other: Image | number): Image;
    add(other: Image | number): Image;
    divide(other: Image | number): Image;
    multiply(other: Image | number): Image;
    clip(geometry: Geometry): Image;
    updateMask(mask: Image): Image;
    rename(name: string): Image;
    bitwiseAnd(value: number): Image;
    or(other: Image): Image;
    not(): Image;
    sqrt(): Image;
    reduceRegion(options: {
      reducer: Reducer;
      geometry: Geometry;
      scale: number;
      maxPixels?: number;
      bestEffort?: boolean;
      tileScale?: number;
    }): ComputedObject;
    getMapId(
      options: {
        min: number;
        max: number;
        palette: string[];
      },
      callback?: (result: any, error?: Error) => void
    ): any;
    getInfo(callback: (value: any, error?: Error) => void): void;
  }

  export interface ImageCollection {
    filterDate(start: string, end: string): ImageCollection;
    filter(filter: Filter): ImageCollection;
    filterBounds(geometry: Geometry): ImageCollection;
    map(callback: (image: Image) => Image): ImageCollection;
    sort(property: string, ascending?: boolean): ImageCollection;
    first(): Image;
    size(): ComputedObject;
  }

  export interface Geometry {
    getInfo(callback: (value: any, error?: Error) => void): void;
    bounds(): Geometry;
    buffer(distance: number, projection?: any): Geometry;
    area(): ComputedObject;
  }

  export interface Reducer {
    minMax(): Reducer;
    mean(): Reducer;
    combine(options: { reducer2: Reducer; sharedInputs: boolean }): Reducer;
  }

  export interface Filter {
    lt(property: string, value: number): Filter;
  }

  export interface ComputedObject {
    get(callback: (value: any, error?: Error) => void): void;
    getInfo(callback: (value: any, error?: Error) => void): void;
  }

  export const data: {
    authenticateViaPrivateKey(
      credentials: { client_email: string; private_key: string },
      onSuccess: () => void,
      onError: (error: Error) => void
    ): void;
  };

  export function initialize(
    url?: string | null,
    tileUrl?: string | null,
    onSuccess?: () => void,
    onError?: (error: Error) => void,
    authArgs?: any
  ): void;

  export const Geometry: {
    Point(coordinates: number[], projection?: string): Geometry;
    Polygon(coordinates: number[][][], projection?: string): Geometry;
  };

  export const ImageCollection: {
    (id: string): ImageCollection;
  };


  export const Filter: {
    lt(property: string, value: number): Filter;
    date(start: string, end: string): Filter;
  };

  export const Reducer: {
    minMax(): Reducer;
    mean(): Reducer;
    combine(options: { reducer2: Reducer; sharedInputs: boolean }): Reducer;
  };
}

