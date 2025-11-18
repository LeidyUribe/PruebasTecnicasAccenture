import { ComponentFixture, TestBed } from '@angular/core/testing';
<<<<<<< Updated upstream
=======
import { IonicModule } from '@ionic/angular';
>>>>>>> Stashed changes

import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
<<<<<<< Updated upstream
=======
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

>>>>>>> Stashed changes
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
