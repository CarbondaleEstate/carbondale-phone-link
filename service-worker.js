self.addEventListener("push", event => {
    let data = {
        title: "CARBONDALE",
        body: "Carbondale Estate notification received."
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body
        })
    );
});
