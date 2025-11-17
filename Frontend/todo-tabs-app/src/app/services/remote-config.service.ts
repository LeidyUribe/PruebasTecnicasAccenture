import { Injectable } from '@angular/core';
import { RemoteConfig, getValue, fetchAndActivate } from '@angular/fire/remote-config';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {

  private enableCategoriesSubject = new BehaviorSubject<boolean>(false);
  enableCategories$ = this.enableCategoriesSubject.asObservable();

  constructor(private remoteConfig: RemoteConfig) {
    this.loadRemoteConfig();
  }

  /** Inicializa Remote Config y obtiene el valor del flag */
  async loadRemoteConfig() {
    try {
      // fetchAndActivate descarga y aplica valores en un solo paso
      await fetchAndActivate(this.remoteConfig);

      const flagValue = getValue(this.remoteConfig, 'enableCategories').asBoolean();
      this.enableCategoriesSubject.next(flagValue);

      console.log('%c[RemoteConfig] enableCategories = ' + flagValue, 'color:#4CAF50;font-weight:bold');

    } catch (error) {
      console.error('[RemoteConfig] Error cargando Remote Config:', error);
    }
  }

  /** Getter sincronizado */
  get enableCategories(): boolean {
    return this.enableCategoriesSubject.value;
  }

  /** Método para refrescar manualmente */
  async refresh() {
    try {
      await fetchAndActivate(this.remoteConfig);

      const flagValue = getValue(this.remoteConfig, 'enableCategories').asBoolean();
      this.enableCategoriesSubject.next(flagValue);

      console.log('%c[RemoteConfig] Refreshed → enableCategories = ' + flagValue, 'color:#2196F3;font-weight:bold');

    } catch (error) {
      console.error('[RemoteConfig] Error refrescando Remote Config:', error);
    }
  }
}
