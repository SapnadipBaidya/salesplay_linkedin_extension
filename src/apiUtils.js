// @ts-nocheck
import { iq_api_v2 } from "./authUtils";


export const getApolloContactDetails = async (linkedin_url, company_id) => {
  try {
    const response = await iq_api_v2.post(
      `/linkedin_connector/get_apollo_contact_details`,
      null, // No request body
      {
        params: {
          linkedin_url: linkedin_url,
          company_id: company_id
        },
        // Using params causes Axios to append ?linkedin_url=...&company_id=... to the URL
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching contact details:", error);
    throw error;
  }
};



export async function enrichContactV3(userId,linkedinUrl, phoneAccess=false,onSuccess=async()=>null,onError=async()=>null) {
  try {
    const base ={
       linkedin_url: linkedinUrl,
       user_id: userId,
    }

    if (phoneAccess) {
      base.enrich_phone = true
    }
    const response = await iq_api_v2.post("/contact/enrich_contact_v3", base);
    if (!response?.data?.email) {
      throw "Email Not Forund"
    }
    if (phoneAccess && response?.data?.phone) {
       throw "Phone Not Forund"
    }
    await onSuccess(response?.data?.email);
    return response?.data;
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    await onError();

  }
}





export async function getSavedGlobalContactsPerUserId(userId) {
  try {
    const formData = new FormData();
    formData.append("user_id", userId); // ✅ key name must match API requirement

    const resp = await iq_api_v2.post(
      "/contact/get_user_filters",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    );


      const formatted = resp?.data
        ?.map((item) => ({
          id: item?._id || null,
          name: item?.name || null,
          contacts: item?.filters?.contacts || [],
          defaultList: item?.filters?.defaultList || false,
          count:item?.count||null,
          taskId:item?.task_id||null
        }))
        // ---- Sort so defaultList === true always comes first ----
        ?.sort((a, b) => (b.defaultList === true) - (a.defaultList === true));
      return formatted;
  } catch (error) {
    console.error("getSavedGlobalContactsPerUserId error:", error);
    throw error;
  }
}


export async function createGlobalContactList(
  request_type, 
  enrich_option,
  userId, 
  additionalProps1, 
  exclude_contacts = [], 
  include_contacts = [], 
  save_include_contacts=[],
  existing_filter_id = null, 
  new_filter_name = null,
  disable_list_creation=false,
  current_list_id=null
) {
  try {
    // 1. Construct the payload
    const payload = {
      filter_request: {
        additionalProp1: additionalProps1 || {}
      },
      save_include_contacts:[],
      include_contacts:[], 
      exclude_contacts: exclude_contacts,
      enrich_option:[]
    };
    if(enrich_option){
       payload.enrich_option=enrich_option;
    }
    if (disable_list_creation) {
      payload.disable_list_creation=disable_list_creation
    }
    
    if (request_type=="save") {
      payload.save_include_contacts=save_include_contacts
    }else{
       payload.include_contacts =include_contacts 

    }

    // 2. Dynamically build query parameters to handle unused params
    const params = new URLSearchParams({
      user_id: userId,
      request_type: request_type,
      ...(existing_filter_id && { existing_filter_id }),
      ...(new_filter_name && { new_filter_name }),     
       ...(current_list_id && { current_list_id })
    });

    // 3. Execute POST request
    const response = await iq_api_v2.post(
      `/contact/export_contact?${params.toString()}`, 
      payload, 
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    // Better error logging for debugging API responses
    console.error("Export failed:", error.response?.data || error.message);
    throw error;
  }
}


export async function getCreditBalance(userId) {
  try {
    const formData = new FormData();
    formData.append("user_id", userId); 

    const resp = await iq_api_v2.post(
      "/credit/get_balance",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    );
    return resp?.data;
  } catch (error) {
    console.error("deleteContactFilter error:", error);
    return false

  }
}

export async function getCreditTransactions(userId) {
  try {
    const formData = new FormData();
    formData.append("user_id", userId); // ✅ key name must match API requirement

    const resp = await iq_api_v2.post(
      "/credit/get_transactions",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    );
    return resp?.data;
  } catch (error) {
    console.error("deleteContactFilter error:", error);
    return false

  }
}
