import { Injectable } from '@angular/core';
import { AngularFireRemoteConfig } from '@angular/fire/compat/remote-config';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  private cacheExpiry = 60 * 60 * 1000; // 1 hora
  private cachedFlags: Map<string, any> = new Map();
  private cacheTime: number = 0;

  constructor(private remoteConfig: AngularFireRemoteConfig) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Configurar valores por defecto
      this.remoteConfig.defaultConfig = {
        enableCategories: false
      };

      // Activar Remote Config
      await this.remoteConfig.fetchAndActivate();
    } catch (error) {
      console.error('Error initializing Remote Config:', error);
    }
  }

  async getFeatureFlag(flagName: string): Promise<boolean> {
    // Verificar caché
    const now = Date.now();
    if (this.cachedFlags.has(flagName) && (now - this.cacheTime) < this.cacheExpiry) {
      return this.cachedFlags.get(flagName);
    }

    try {
      // Obtener valor actualizado
      await this.remoteConfig.fetchAndActivate();
      const value = this.remoteConfig.getBoolean(flagName);
      
      // Actualizar caché
      this.cachedFlags.set(flagName, value);
      this.cacheTime = now;
      
      return value;
    } catch (error) {
      console.error(`Error getting flag ${flagName}:`, error);
      // Retornar valor por defecto o del caché
      return this.cachedFlags.get(flagName) || false;
    }
  }

  getFeatureFlag$(flagName: string): Observable<boolean> {
    return from(this.remoteConfig.fetchAndActivate()).pipe(
      map(() => {
        const value = this.remoteConfig.getBoolean(flagName);
        this.cachedFlags.set(flagName, value);
        this.cacheTime = Date.now();
        return value;
      }),
      catchError(error => {
        console.error(`Error getting flag ${flagName}:`, error);
        return of(this.cachedFlags.get(flagName) || false);
      })
    );
  }

  async refreshConfig(): Promise<void> {
    try {
      await this.remoteConfig.fetchAndActivate();
      this.cacheTime = Date.now();
    } catch (error) {
      console.error('Error refreshing config:', error);
    }
  }

  getString(key: string): string {
    return this.remoteConfig.getString(key);
  }

  getNumber(key: string): number {
    return this.remoteConfig.getNumber(key);
  }
}