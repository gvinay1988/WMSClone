export class HttpReq {
     url?: string;
    type?: string;
    showLoader: any = false;
    body: any = {};
    contentType: any = 'application/json';
    isAcessTokenReq = false;
}
export interface ErrorMessage {
   code: string;
   message: string;
}
export interface Menu{
   id: string;
   name: string;
   link: string;
   show: boolean;
   icon: string;
}

export class SessionUser {
  /*   id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    mobile : string;
    loginUser: boolean;
    photo: string; */
    branchId: string = 'NONE';
    branchName: string = 'NONE';
 /*    menuList: Menu[]; */
}
