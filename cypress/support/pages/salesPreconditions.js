const getAuthToken = () => {
  return cy
    .request({
      method: "POST",
      url: "http://localhost:8080/api/auth/login",
      body: {
        username: Cypress.env("ADMIN_USER"),
        password: Cypress.env("ADMIN_PASS"),
      },
    })
    .then((response) => response.body.token);
};

export const ensurePlantStock = (plantName, qty) => {
  getAuthToken().then((token) => {
    const authHeader = { Authorization: `Bearer ${token}` };

    const mainName = "Main";
    const subName = "Anthu";

    const findOrCreateCategory = (name, parentObj) => {
      return cy
        .request({
          method: "POST",
          url: "http://localhost:8080/api/categories",
          headers: authHeader,
          body: { id: 0, name: name, parent: parentObj, subCategories: [] },
          failOnStatusCode: false, // Don't crash on 400 Duplicate
        })
        .then((res) => {
          if (res.status === 201 || res.status === 200) {
            return res.body;
          } else {
            return cy
              .request({
                method: "GET",
                url: "http://localhost:8080/api/categories",
                headers: authHeader,
              })
              .then((allRes) => {
                return allRes.body.find((c) => c.name === name);
              });
          }
        });
    };

    findOrCreateCategory(mainName, null).then((mainCategory) => {
      findOrCreateCategory(subName, mainCategory).then((subCategory) => {
        cy.request({
          method: "GET",
          url: "http://localhost:8080/api/plants",
          headers: authHeader,
        }).then((plantRes) => {
          const plant = plantRes.body.find((p) => p.name === plantName);

          const plantData = {
            id: plant ? plant.id : 0,
            name: plantName,
            price: 150,
            quantity: qty,
            category: subCategory,
          };

          const method = plant ? "PUT" : "POST";
          const url = plant
            ? `http://localhost:8080/api/plants/${plant.id}`
            : "http://localhost:8080/api/plants";

          cy.request({
            method: method,
            url: url,
            headers: authHeader,
            body: plantData,
          });
        });
      });
    });
  });
};
