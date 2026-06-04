import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import { SuperAppCommandService, BabyProfile } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';
import { API_CONFIG } from '../shared/constants/api.constant';
import { AuthService } from '../auth/auth.service';

// Leaflet import bypass SSR issue
import * as L from 'leaflet';

interface TravelDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayIndex: number;
  notes?: string;
  imageUrl?: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  category: 'baby' | 'parents' | 'documents' | 'other';
  completed: boolean;
}

interface TravelPlan {
  id: string;
  familyId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  destinations: TravelDestination[];
  checklist: ChecklistItem[];
  aiIdeas?: string;
}

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzDatePickerModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTabsModule,
    NzTagModule,
    NzTimelineModule,
    NzDividerModule,
    NzCheckboxModule
  ],
  templateUrl: './travel.component.html',
  styleUrl: './travel.component.css'
})
export class TravelComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly destroy$ = new Subject<void>();
  
  // State
  familyId: number = API_CONFIG.DEFAULT_FAMILY_ID;
  travelPlans: TravelPlan[] = [];
  selectedPlan: TravelPlan | null = null;
  babies: BabyProfile[] = [];
  
  // Leaflet map
  private map: L.Map | null = null;
  private markersGroup: L.FeatureGroup | null = null;
  private routeLine: L.Polyline | null = null;
  private previewMarker: L.Marker | null = null;
  
  // UI Controls
  isLoading = false;
  isSaving = false;
  isSaved = false;
  isCreateModalVisible = false;
  isAddDestModalVisible = false;
  isAiGenerating = false;
  isAiCreateModalVisible = false;
  
  searchQuery = '';
  searchResults: any[] = [];
  isSearchingDest = false;
  isUploadingImage = false;
  uploadedImageUrl = '';
  
  aiPrompt = '';
  aiSuggestionResponse = '';
  
  newChecklistItemText = '';
  newChecklistItemCategory: 'baby' | 'parents' | 'documents' | 'other' = 'baby';

  // Forms
  readonly travelPlanForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    dateRange: [[] as Date[], [Validators.required]]
  });

  readonly aiCreateForm = this.fb.group({
    destination: ['', [Validators.required]],
    durationDays: [3, [Validators.required, Validators.min(1)]],
    startDate: [null as Date | null, [Validators.required]],
    preferences: ['']
  });

  readonly destinationForm = this.fb.group({
    name: ['', [Validators.required]],
    lat: [0, [Validators.required]],
    lng: [0, [Validators.required]],
    dayIndex: [1, [Validators.required, Validators.min(1)]],
    notes: ['', [Validators.maxLength(200)]],
    imageUrl: ['']
  });

  ngOnInit(): void {
    this.familyId = this.command.getFamilyId();
    this.loadTravelPlans();
    this.loadBabies();
  }

  ngAfterViewInit(): void {
    // We defer map initialization until we have a trip selected and a div container is rendered
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }

  loadTravelPlans(): void {
    this.isLoading = true;
    this.command.getTravelPlans(this.familyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.travelPlans = res;
          if (this.travelPlans) {
            this.travelPlans.forEach(p => {
              if (!p.checklist) p.checklist = [];
            });
          }
          if (this.travelPlans.length > 0) {
            this.selectPlan(this.travelPlans[0]);
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.notification.error('Lỗi', 'Không thể tải danh sách chuyến đi từ server.');
        }
      });
  }

  updateSelectedPlanOnBackend(): void {
    if (!this.selectedPlan) return;
    this.isSaving = true;
    this.isSaved = false;
    
    // Gửi PUT lên server để cập nhật chuyến đi
    this.command.updateTravelPlan(this.selectedPlan.id, this.selectedPlan)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.isSaved = true;
          
          // Cập nhật lại trong mảng cục bộ
          const idx = this.travelPlans.findIndex(p => p.id === updated.id);
          if (idx !== -1) {
            this.travelPlans[idx] = updated;
          }
          this.selectedPlan = updated;
          this.drawRoute();
          
          setTimeout(() => {
            this.isSaved = false;
          }, 3000);
        },
        error: (err) => {
          this.isSaving = false;
          this.notification.error('Lỗi', 'Không thể đồng bộ thay đổi vào cơ sở dữ liệu.');
        }
      });
  }

  loadBabies(): void {
    this.command.getBabies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.babies = res;
          this.initDefaultPrompt();
        },
        error: () => {}
      });
  }

  initDefaultPrompt(): void {
    const babyAgeText = this.babies.map(b => {
      const diff = Date.now() - new Date(b.birthDate).getTime();
      const ageMonths = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.4));
      return `${b.name} (${ageMonths} tháng tuổi)`;
    }).join(', ');

    if (this.babies.length > 0) {
      this.aiPrompt = `Lên lịch trình du lịch Đà Lạt 3 ngày 2 đêm cho gia đình có trẻ em: ${babyAgeText}. Đề xuất các địa điểm tham quan thân thiện với trẻ nhỏ, khách sạn tiện nghi và checklist đồ dùng cần chuẩn bị cho bé.`;
    } else {
      this.aiPrompt = `Lên lịch trình du lịch Phú Quốc 4 ngày 3 đêm cho gia đình. Đề xuất các địa điểm tham quan hấp dẫn, địa điểm ăn uống đặc sản địa phương và hành trình khoa học theo từng ngày.`;
    }
  }

  selectPlan(plan: TravelPlan): void {
    this.selectedPlan = plan;
    if (this.selectedPlan && !this.selectedPlan.checklist) {
      this.selectedPlan.checklist = [];
    }
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  initMap(): void {
    if (typeof window === 'undefined') return;
    const mapElement = document.getElementById('leaflet-travel-map');
    if (!mapElement) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Default coordinates (Hanoi, Vietnam)
    let centerLat = 21.0285;
    let centerLng = 105.8542;

    // Center on the first destination if it exists
    if (this.selectedPlan && this.selectedPlan.destinations.length > 0) {
      centerLat = this.selectedPlan.destinations[0].lat;
      centerLng = this.selectedPlan.destinations[0].lng;
    }

    this.map = L.map('leaflet-travel-map').setView([centerLat, centerLng], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.markersGroup = L.featureGroup().addTo(this.map);
    
    // Fix leaflet marker default icons issue with webpack/angular
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
    L.Marker.prototype.options.icon = defaultIcon;

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.openAddDestinationAt(e.latlng.lat, e.latlng.lng);
    });

    this.drawRoute();
  }

  getSafeImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('blob:')) {
      return url;
    }
    const cleanUrl = url.split('?')[0];
    const token = this.authService.getToken();
    return token ? `${cleanUrl}?token=${token}` : cleanUrl;
  }

  drawRoute(): void {
    if (!this.map || !this.markersGroup || !this.selectedPlan) return;

    this.markersGroup.clearLayers();
    if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }

    const destinations = [...this.selectedPlan.destinations].sort((a, b) => a.dayIndex - b.dayIndex);
    const coordinates: L.LatLngTuple[] = [];

    destinations.forEach((dest, index) => {
      let innerHtml = `<div class="map-marker-pin"><span class="pin-number">${index + 1}</span></div>`;
      if (dest.imageUrl) {
        const safeUrl = this.getSafeImageUrl(dest.imageUrl);
        innerHtml = `<div class="map-marker-pin map-marker-pin--image" style="background-image: url('${safeUrl}')">
                       <span class="pin-number-badge">${index + 1}</span>
                     </div>`;
      }

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: innerHtml,
        iconSize: dest.imageUrl ? [40, 40] : [30, 30],
        iconAnchor: dest.imageUrl ? [20, 40] : [15, 30]
      });

      let popupContent = `<strong>${dest.name}</strong><br>Ngày ${dest.dayIndex}<br>${dest.notes || ''}`;
      if (dest.imageUrl) {
        const safeUrl = this.getSafeImageUrl(dest.imageUrl);
        popupContent = `
          <div class="map-popup-card">
            <img src="${safeUrl}" class="map-popup-img" />
            <div class="map-popup-body">
              <strong>${dest.name}</strong>
              <div class="map-popup-day">Ngày ${dest.dayIndex}</div>
              <p class="map-popup-notes">${dest.notes || ''}</p>
            </div>
          </div>
        `;
      }

      L.marker([dest.lat, dest.lng], { icon: customIcon })
        .bindPopup(popupContent, { maxWidth: 220 })
        .addTo(this.markersGroup!);
      
      coordinates.push([dest.lat, dest.lng]);
    });

    if (coordinates.length > 1) {
      this.routeLine = L.polyline(coordinates, {
        color: 'var(--user-primary, #f97316)',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
        lineJoin: 'round'
      }).addTo(this.map);

      // Fit map bounds to show all markers
      this.map.fitBounds(this.markersGroup.getBounds(), { padding: [50, 50] });
    } else if (coordinates.length === 1) {
      this.map.setView(coordinates[0], 14);
    }
  }

  openCreateModal(): void {
    this.travelPlanForm.reset({
      title: '',
      description: '',
      dateRange: []
    });
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
  }

  openAiCreateModal(): void {
    this.aiCreateForm.reset({
      destination: '',
      durationDays: 3,
      startDate: null,
      preferences: ''
    });
    this.isAiCreateModalVisible = true;
  }

  closeAiCreateModal(): void {
    this.isAiCreateModalVisible = false;
  }

  submitAiGeneratePlan(): void {
    if (this.aiCreateForm.invalid) {
      this.aiCreateForm.markAllAsTouched();
      return;
    }

    const formVal = this.aiCreateForm.value;
    const destination = formVal.destination?.trim() ?? '';
    const durationDays = Number(formVal.durationDays);
    const startDateObj = formVal.startDate as Date;
    const startDateStr = startDateObj.toISOString().split('T')[0];
    const preferences = formVal.preferences?.trim() ?? '';

    // Calculate endDate based on durationDays
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + durationDays - 1);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    this.isAiGenerating = true;

    this.command.generateTravelPlan({
      destination,
      durationDays,
      startDate: startDateStr,
      preferences,
      language: this.i18n.getCurrentLanguage()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (aiPlan) => {
        // Map destinations and checklist from AI response
        const mappedDestinations = (aiPlan.destinations || []).map((dest: any, idx: number) => ({
          id: `dest_${Date.now()}_${idx}`,
          name: dest.name,
          lat: Number(dest.lat),
          lng: Number(dest.lng),
          dayIndex: Number(dest.dayIndex),
          notes: dest.notes || '',
          imageUrl: ''
        }));

        const mappedChecklist = (aiPlan.checklist || []).map((check: any, idx: number) => ({
          id: `c_${Math.random()}_${idx}`,
          task: check.task,
          category: check.category || 'other',
          completed: false
        }));

        const finalPlan: TravelPlan = {
          id: 'plan_' + Date.now(),
          familyId: this.familyId,
          title: aiPlan.title || `${destination} Trip`,
          description: aiPlan.description || '',
          startDate: startDateStr,
          endDate: endDateStr,
          destinations: mappedDestinations,
          checklist: mappedChecklist,
          aiIdeas: 'Tạo tự động bằng AI.'
        };

        this.command.createTravelPlan(finalPlan)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (saved) => {
              this.travelPlans.push(saved);
              this.selectPlan(saved);
              this.closeAiCreateModal();
              this.isAiGenerating = false;
              this.notification.success('Thành công', 'Đã tạo chuyến đi bằng AI thành công!');
            },
            error: () => {
              this.isAiGenerating = false;
              this.notification.error('Lỗi', 'Không thể lưu chuyến đi sinh ra từ AI vào server.');
            }
          });
      },
      error: (err) => {
        this.isAiGenerating = false;
        this.notification.error('Lỗi', 'AI gặp lỗi khi lập lịch trình: ' + (err.message || ''));
      }
    });
  }

  submitCreatePlan(): void {
    if (this.travelPlanForm.invalid) {
      this.travelPlanForm.markAllAsTouched();
      return;
    }

    const formVal = this.travelPlanForm.value;
    const dates = formVal.dateRange as Date[];
    
    if (!dates || dates.length < 2) {
      this.notification.warning('Lỗi', 'Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }

    const newPlan: TravelPlan = {
      id: 'plan_' + Date.now(),
      familyId: this.familyId,
      title: formVal.title?.trim() ?? '',
      description: formVal.description?.trim() ?? '',
      startDate: dates[0].toISOString().split('T')[0],
      endDate: dates[1].toISOString().split('T')[0],
      destinations: [],
      checklist: this.generateDefaultChecklist()
    };

    this.isLoading = true;
    this.command.createTravelPlan(newPlan)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          this.travelPlans.push(saved);
          this.selectPlan(saved);
          this.closeCreateModal();
          this.isLoading = false;
          this.notification.success('Thành công', 'Đã tạo chuyến đi mới thành công!');
        },
        error: () => {
          this.isLoading = false;
          this.notification.error('Lỗi', 'Không thể lưu chuyến đi mới vào server.');
        }
      });
  }

  generateDefaultChecklist(): ChecklistItem[] {
    return [
      { id: 'c_' + Math.random(), task: 'Chuẩn bị CCCD/Hộ chiếu cho bố mẹ và giấy khai sinh của bé', category: 'documents', completed: false },
      { id: 'c_' + Math.random(), task: 'Đặt vé máy bay, vé tàu hoặc thuê xe di chuyển', category: 'documents', completed: false },
      { id: 'c_' + Math.random(), task: 'Đặt phòng khách sạn có cũi hoặc giường em bé', category: 'documents', completed: false },
      { id: 'c_' + Math.random(), task: 'Tã giấy, khăn ướt, khăn khô cho bé', category: 'baby', completed: false },
      { id: 'c_' + Math.random(), task: 'Sữa công thức, bình sữa và dụng cụ vệ sinh bình sữa', category: 'baby', completed: false },
      { id: 'c_' + Math.random(), task: 'Thuốc hạ sốt, men tiêu hóa, kem chống muỗi, kem chống nắng cho bé', category: 'baby', completed: false },
      { id: 'c_' + Math.random(), task: 'Quần áo mát mẻ, mũ chống nắng và áo khoác mỏng cho bé', category: 'baby', completed: false },
      { id: 'c_' + Math.random(), task: 'Quần áo đi biển/dạo phố cho bố mẹ', category: 'parents', completed: false },
      { id: 'c_' + Math.random(), task: 'Sạc điện thoại, sạc dự phòng, máy ảnh', category: 'other', completed: false },
      { id: 'c_' + Math.random(), task: 'Xe đẩy gấp gọn hoặc địu em bé', category: 'baby', completed: false }
    ];
  }

  deletePlan(plan: TravelPlan, event: MouseEvent): void {
    event.stopPropagation();
    
    this.isLoading = true;
    this.command.deleteTravelPlan(plan.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.travelPlans = this.travelPlans.filter(p => p.id !== plan.id);
          if (this.selectedPlan?.id === plan.id) {
            if (this.travelPlans.length > 0) {
              this.selectPlan(this.travelPlans[0]);
            } else {
              this.selectedPlan = null;
              if (this.map) {
                this.map.remove();
                this.map = null;
              }
            }
          }
          this.isLoading = false;
          this.notification.success('Thành công', 'Đã xóa chuyến đi thành công!');
        },
        error: () => {
          this.isLoading = false;
          this.notification.error('Lỗi', 'Không thể xóa chuyến đi này trên server.');
        }
      });
  }

  // Destination Management
  openAddDestinationAt(lat: number, lng: number): void {
    if (!this.selectedPlan) {
      this.notification.warning('Thông báo', 'Vui lòng chọn hoặc tạo chuyến đi trước.');
      return;
    }
    
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));

    this.destinationForm.reset({
      name: 'Đang xác định vị trí...',
      lat: fixedLat,
      lng: fixedLng,
      dayIndex: 1,
      notes: '',
      imageUrl: ''
    });
    this.isAddDestModalVisible = true;

    // Reset temporary variables for upload
    this.isUploadingImage = false;
    this.uploadedImageUrl = '';

    // Cập nhật marker xem trước tạm thời trên bản đồ
    this.updatePreviewMarker(fixedLat, fixedLng);

    // Gọi reverse geocoding để lấy tên địa điểm
    this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.display_name) {
            // Lấy phần đầu ngắn gọn của địa chỉ (tên địa điểm / số nhà / đường)
            const shortName = res.display_name.split(',')[0];
            this.destinationForm.patchValue({ name: shortName });
          } else {
            this.destinationForm.patchValue({ name: 'Vị trí tùy chỉnh' });
          }
        },
        error: () => {
          this.destinationForm.patchValue({ name: 'Vị trí tùy chỉnh' });
        }
      });
  }

  updatePreviewMarker(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.previewMarker) {
      this.previewMarker.setLatLng([lat, lng]);
    } else {
      const tempIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      });

      this.previewMarker = L.marker([lat, lng], {
        icon: tempIcon,
        draggable: true
      }).addTo(this.map);

      // Lắng nghe sự kiện kéo thả marker để cập nhật form & reverse geocode
      this.previewMarker.on('dragend', (event: any) => {
        const marker = event.target;
        const position = marker.getLatLng();
        this.onPreviewMarkerDragged(position.lat, position.lng);
      });
    }

    this.map.setView([lat, lng], this.map.getZoom() < 14 ? 14 : this.map.getZoom());
  }

  onPreviewMarkerDragged(lat: number, lng: number): void {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));

    this.destinationForm.patchValue({
      lat: fixedLat,
      lng: fixedLng,
      name: 'Đang xác định vị trí...'
    });

    this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${fixedLat}&lon=${fixedLng}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.display_name) {
            const shortName = res.display_name.split(',')[0];
            this.destinationForm.patchValue({ name: shortName });
          } else {
            this.destinationForm.patchValue({ name: 'Vị trí tùy chỉnh' });
          }
        },
        error: () => {
          this.destinationForm.patchValue({ name: 'Vị trí tùy chỉnh' });
        }
      });
  }

  removePreviewMarker(): void {
    if (this.previewMarker) {
      this.previewMarker.remove();
      this.previewMarker = null;
    }
  }

  closeAddDestModal(): void {
    this.isAddDestModalVisible = false;
    this.searchResults = [];
    this.searchQuery = '';
    this.removePreviewMarker(); // Dọn dẹp marker tạm thời khi đóng modal
  }

  searchDestination(): void {
    const query = this.searchQuery.trim();
    if (!query) return;

    this.isSearchingDest = true;
    this.http.get<any[]>(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.searchResults = res;
          this.isSearchingDest = false;
        },
        error: () => {
          this.isSearchingDest = false;
          this.notification.error('Lỗi', 'Không thể kết nối dịch vụ tìm kiếm địa điểm.');
        }
      });
  }

  selectSearchResult(result: any): void {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));

    this.destinationForm.patchValue({
      name: result.display_name.split(',')[0],
      lat: fixedLat,
      lng: fixedLng,
      imageUrl: ''
    });
    this.uploadedImageUrl = '';

    // Cập nhật vị trí marker xem trước và chuyển map view đến điểm tìm thấy
    this.updatePreviewMarker(fixedLat, fixedLng);
  }

  submitAddDestination(): void {
    if (this.destinationForm.invalid || !this.selectedPlan) {
      this.destinationForm.markAllAsTouched();
      return;
    }

    const val = this.destinationForm.value;
    const newDest: TravelDestination = {
      id: 'dest_' + Date.now(),
      name: val.name ?? '',
      lat: val.lat ?? 0,
      lng: val.lng ?? 0,
      dayIndex: val.dayIndex ? Number(val.dayIndex) : 1,
      notes: val.notes ?? '',
      imageUrl: val.imageUrl ?? ''
    };

    this.selectedPlan.destinations.push(newDest);
    this.updateSelectedPlanOnBackend();
    this.closeAddDestModal();
    this.notification.success('Thành công', 'Đã thêm điểm đến vào lộ trình!');
  }

  removeDestination(destId: string): void {
    if (!this.selectedPlan) return;
    this.selectedPlan.destinations = this.selectedPlan.destinations.filter(d => d.id !== destId);
    this.updateSelectedPlanOnBackend();
    this.notification.success('Thành công', 'Đã xóa điểm đến khỏi lộ trình.');
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.isUploadingImage = true;
    this.command.uploadFile(file, 'travel-plans', 'destination')
      .subscribe({
        next: (meta) => {
          this.isUploadingImage = false;
          this.uploadedImageUrl = `${API_CONFIG.GATEWAY_URL}/file/files/${meta.id}/view`;
          this.destinationForm.patchValue({ imageUrl: this.uploadedImageUrl });
          this.notification.success('Thành công', 'Đã tải lên ảnh địa điểm!');
        },
        error: (err) => {
          this.isUploadingImage = false;
          this.notification.error('Lỗi', 'Không thể tải lên ảnh: ' + (err.message || ''));
        }
      });
  }

  removeUploadedImage(): void {
    this.uploadedImageUrl = '';
    this.destinationForm.patchValue({ imageUrl: '' });
  }

  // Checklist
  addChecklistItem(): void {
    const text = this.newChecklistItemText.trim();
    if (!text) {
      this.notification.warning('Cảnh báo', 'Vui lòng nhập tên đồ dùng cần chuẩn bị.');
      return;
    }
    if (!this.selectedPlan) {
      this.notification.warning('Cảnh báo', 'Vui lòng chọn hoặc tạo chuyến đi trước.');
      return;
    }

    if (!this.selectedPlan.checklist) {
      this.selectedPlan.checklist = [];
    }

    const newItem: ChecklistItem = {
      id: 'c_' + Math.random(),
      task: text,
      category: this.newChecklistItemCategory,
      completed: false
    };

    this.selectedPlan.checklist = [...this.selectedPlan.checklist, newItem];
    this.updateSelectedPlanOnBackend();
    this.newChecklistItemText = '';
    this.notification.success('Thành công', 'Đã thêm đồ dùng cần chuẩn bị.');
  }

  toggleChecklistItem(item: ChecklistItem): void {
    item.completed = !item.completed;
    this.updateSelectedPlanOnBackend();
  }

  removeChecklistItem(itemId: string): void {
    if (!this.selectedPlan) return;
    this.selectedPlan.checklist = this.selectedPlan.checklist.filter(c => c.id !== itemId);
    this.updateSelectedPlanOnBackend();
  }

  getFilteredChecklist(category: string): ChecklistItem[] {
    if (!this.selectedPlan) return [];
    return this.selectedPlan.checklist.filter(c => c.category === category);
  }

  getCompletionPercent(category: string): number {
    const items = this.getFilteredChecklist(category);
    if (items.length === 0) return 0;
    const completed = items.filter(c => c.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  // AI Copilot Integration
  generateAiTravelIdea(): void {
    if (!this.aiPrompt.trim()) return;

    this.isAiGenerating = true;
    this.aiSuggestionResponse = '';

    const history = [
      { role: 'user', content: 'Chào bạn, tôi đang lên kế hoạch du lịch cùng gia đình, hãy giúp tôi lên ý tưởng lịch trình.' }
    ];

    const context = `
=== THÔNG TIN GIA ĐÌNH ===
- Hộ gia đình ID: ${this.familyId}
- Số em bé trong nhà: ${this.babies.length}
${this.babies.map(b => `- Bé: ${b.name}, sinh ngày ${b.birthDate}`).join('\n')}
`;

    this.http.post<any>(`${API_CONFIG.GATEWAY_URL}/ai/copilot/chat`, {
      familyId: this.familyId,
      locale: this.i18n.getCurrentLanguage(),
      message: this.aiPrompt.trim(),
      context: context.trim(),
      history
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.aiSuggestionResponse = res.data.answer || 'Không thể tạo gợi ý lúc này.';
          if (this.selectedPlan) {
            this.selectedPlan.aiIdeas = this.aiSuggestionResponse;
            this.updateSelectedPlanOnBackend();
          }
        } else {
          this.aiSuggestionResponse = 'Không có phản hồi từ AI.';
        }
        this.isAiGenerating = false;
      },
      error: (err) => {
        this.isAiGenerating = false;
        this.aiSuggestionResponse = 'Lỗi kết nối với máy chủ AI: ' + (err?.error?.message || err.message);
        this.notification.error('Lỗi', 'Không thể sinh lịch trình từ AI.');
      }
    });
  }

  applyAiSuggestionToPlan(): void {
    if (!this.selectedPlan || !this.aiSuggestionResponse) return;
    this.selectedPlan.aiIdeas = this.aiSuggestionResponse;
    this.updateSelectedPlanOnBackend();
    this.notification.success('Thành công', 'Đã lưu ý tưởng AI vào chuyến đi này.');
  }

  // Helper formatting
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(this.i18n.getCurrentLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
