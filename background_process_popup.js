
(async function() {
    if (!Xrm.Page || !Xrm.Page.data || !Xrm.Page.data.entity) {
        alert('This script must be run from a Dynamics 365 form context.');
        return;
    }

    const entityName = Xrm.Page.data.entity.getEntityName();
    const orgUrl = Xrm.Utility.getGlobalContext().getClientUrl();

    try {
        const response = await fetch(`${orgUrl}/api/data/v9.2/workflows?$select=name,type,category,statecode,statuscode,workflowid,primaryentity&$filter=primaryentity eq '${entityName}' and (category eq 0 or category eq 1 or category eq 2 or category eq 3 or category eq 5)&$orderby=name asc`, {
            headers: {
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Prefer': 'odata.include-annotations="*"'
            }
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        const processes = data.value.map(workflow => {
            let processType = 'Workflow';
            if (workflow.type === 1) {
                switch (workflow.category) {
                    case 0: processType = 'Sync Workflow'; break;
                    case 1: processType = 'Async Workflow'; break;
                    case 3: processType = 'Action'; break;
                    default: processType = 'Workflow';
                }
            } else if (workflow.type === 2) {
                processType = 'Business Rule';
            } else if (workflow.category === 5) {
                processType = 'Power Automate Flow';
            }

            return {
                name: workflow.name,
                type: processType,
                status: workflow.statecode === 1 ? 'Active' : 'Inactive',
                id: workflow.workflowid
            };
        });

        const grouped = {};
        processes.forEach(p => {
            if (!grouped[p.type]) grouped[p.type] = [];
            grouped[p.type].push(p);
        });

        let html = '<div style="font-family:Segoe UI;padding:20px;">';
        html += `<h2>Background Processes for ${entityName}</h2>`;
        Object.keys(grouped).forEach(type => {
            html += `<h3 style="color:#1976d2;">${type}</h3><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:20px;"><tr><th>Name</th><th>Status</th><th>Action</th></tr>`;
            grouped[type].forEach(p => {
                const statusColor = p.status === 'Active' ? 'green' : 'red';
                const editorUrl = `${orgUrl}/sfa/workflow/edit.aspx?id=%7b${p.id}%7d`;
                html += `<tr><td>${p.name}</td><td style="color:${statusColor};font-weight:bold;">${p.status}</td><td><a href="${editorUrl}" target="_blank" style="color:#0066cc;text-decoration:none;">Open</a></td></tr>`;
            });
            html += '</table>';
        });
        html += '<button onclick="window.close()" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;">Close</button>';
        html += '</div>';

        const popup = window.open('', '', 'width=1000,height=700');
        popup.document.write(html);
        popup.document.close();

    } catch (err) {
        console.error(err);
        alert('Error fetching background processes.');
    }
})();
