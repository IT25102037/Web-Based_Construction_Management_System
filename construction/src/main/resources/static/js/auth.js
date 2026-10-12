document.addEventListener("DOMContentLoaded", () => {

    if (localStorage.getItem("wbcms_token")) {
        window.location.href = "/dashboard.html";
    }


    const form =
        document.getElementById("loginForm");

    const message =
        document.getElementById("loginMessage");

    const toggle =
        document.getElementById("togglePassword");

    const password =
        document.getElementById("password");


    toggle.addEventListener("click", () => {

        if (password.type === "password") {
            password.type = "text";
        } else {
            password.type = "password";
        }

    });


    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        message.textContent = "Signing in...";


        const username =
            document.getElementById("username")
                .value.trim();

        const passwordValue =
            password.value;


        try {

            const response = await fetch(
                "/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username: username,
                        password: passwordValue
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    data.error ||
                    "Invalid username or password."
                );

            }


            localStorage.setItem(
                "wbcms_token",
                data.token
            );


            localStorage.setItem(
                "wbcms_username",
                data.username || username
            );


            localStorage.setItem(
                "wbcms_role",
                data.role || "STAFF"
            );


            localStorage.setItem(
                "wbcms_user_type",
                "STAFF"
            );


            localStorage.setItem(
                "wbcms_user",
                JSON.stringify({
                    username:
                        data.username || username,

                    role:
                        data.role || "STAFF"
                })
            );


            window.location.href =
                "/dashboard.html";


        } catch (error) {

            message.textContent =
                error.message ||
                "Unable to connect to server.";

        }

    });

});