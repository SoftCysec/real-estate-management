import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../shared/interface/api-response';
import { Enquiry, EnquiryCreate } from '../shared/interface/enquiry';
import { Property } from '../shared/interface/property';
import { headerDict } from '../shared/utility';
import { UserService } from '../user/user.service';

const enquiryUrl = environment.api.url + 'enquiries';
const requestOptions = (token = '', body = {},) => ({
  headers: new HttpHeaders(headerDict({ token })),
  body
});

interface ResEnquiry extends ApiResponse {
  data: Enquiry;
}

interface ResEnquiries extends ApiResponse {
  data: Enquiry[];
}

@Injectable({
  providedIn: 'root'
})
export class EnquiriesService {
  public initialFetchDone = false;
  public readonly enquiries$: Observable<Enquiry[]>;
  public readonly enquiry$: Observable<Enquiry>;
  private readonly enquiriesSub = new BehaviorSubject<Enquiry[]>([]);
  private readonly enquirySub = new BehaviorSubject<Enquiry>(null);

  constructor(private http: HttpClient, private userService: UserService) {
    this.enquiries$ = this.enquiriesSub.asObservable();
    this.enquiry$ = this.enquirySub.asObservable();
  }

  public get enquiries(): Enquiry[] {
    return this.enquiriesSub.getValue();
  }

  public set enquiries(enquiries: Enquiry[]) {
    this.enquiriesSub.next(enquiries);
  }

  public get enquiry(): Enquiry | null {
    return this.enquirySub.getValue();
  }

  public set enquiry(enquiry: Enquiry) {
    this.enquirySub.next(enquiry);
  }

  public async fetchEnquiries(): Promise<void> {
    try {
      const token = this.userService.token();
      this.enquiries = (await this.http.get<ResEnquiries>(enquiryUrl, requestOptions(token)).toPromise()).data;
      this.initialFetchDone = true;
    } catch (error) {
      console.error(error);
      return error.error || error;
    }
  }

  public async addEnquiry(enquiry: EnquiryCreate, property: Partial<Property>): Promise<ResEnquiry> {
    const token = this.userService.token();
    const formData = {
      ...enquiry,
      property: {
        property_id: property.property_id,
        name: property.name,
      },
      userTo: property.user_id
    };

    try {
      const res = await this.http.post<ResEnquiry>(enquiryUrl, formData, requestOptions(token))
        .toPromise();
      this.enquiries = [...this.enquiries, res.data];
      return res;
    } catch (error) {
      console.error(error);
      return error.error || error;
    }
  }

  public async removeEnquiry(enqId: string): Promise<ApiResponse> {
    const token = this.userService.token();
    const url = enquiryUrl + '/' + enqId;
    try {
      const res = await this.http.delete<ApiResponse>(url, requestOptions(token)).toPromise();
      if (res && res.status === 200) {
        this.enquiries = this.enquiries.filter(enquiry => enquiry.enquiry_id !== enqId);
        return res;
      }
    } catch (error) {
      console.error(error);
      return error.error || error;
    }
  }

  public async readEnquiry(enqId: string): Promise<void> {
    const token = this.userService.token();
    const url = enquiryUrl + '/' + enqId;
    try {
      const { data } = await this.http.patch<ResEnquiry>(url, { read: true }, requestOptions(token)).toPromise();
      // UPDATE ENQUIRIES && CURRENT ENQUIRY
      this.enquiries = this.enquiries.map(enquiry => (enquiry.enquiry_id === enqId) ? data : enquiry);
      this.enquiry = data;
    } catch (error) {
      console.error(error);
    }
  }
}
