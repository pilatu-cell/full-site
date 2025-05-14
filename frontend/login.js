
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.innerHTML = ''; // Clear previous errors

    const email = document.getElementById("email").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();
        console.log('Response:', data); // Debug log

        if (response.ok) {
            const successMessage = document.createElement("p");
            successMessage.innerText = data.message || "User created successfully";
            successMessage.style.color = "green";
            errorContainer.appendChild(successMessage);
            
            // Redirect to payment page
            window.location.replace("/menu&payment");
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                const errorList = document.createElement('ul');
                data.errors.forEach(error => {
                    const li = document.createElement('li');
                    li.textContent = error;
                    errorList.appendChild(li);
                });
                errorContainer.appendChild(errorList);
            } else {
                errorContainer.textContent = 'An error occurred during signup.';
            }
        }
    } catch (error) {
        console.error('Error:', error); // Debug log
        errorContainer.textContent = 'An error occurred. Please try again.';
    }
});