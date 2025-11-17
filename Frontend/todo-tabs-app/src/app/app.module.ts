import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';

import { environment } from '../environments/environment';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,

    IonicModule.forRoot({ mode: 'md' }),
    AppRoutingModule,

    IonicStorageModule.forRoot({
      name: '__mytabsappdb',
      driverOrder: [CordovaSQLiteDriver._driver, 'indexeddb', 'localstorage']
    }),
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    // 🚀 Firebase Modular PROVIDERS, NO en imports
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideRemoteConfig(() => {
      const remoteConfig = getRemoteConfig();
      remoteConfig.settings = {
        minimumFetchIntervalMillis: 60_000,
        fetchTimeoutMillis: 10_000,
      };
      remoteConfig.defaultConfig = {
        enableCategories: false,
      };
      return remoteConfig;
    }),
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
